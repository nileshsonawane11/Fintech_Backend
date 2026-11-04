package com.fintech.account.controller;

import com.fintech.account.dto.request.AccountApplicationRequest;
import com.fintech.account.dto.response.AccountApplicationResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.enums.ApplicationStatus;
import com.fintech.account.security.SecurityUtils;
import com.fintech.account.service.AccountApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/accounts")
@Tag(name = "Customer - Account Applications", description = "Endpoints for applying for accounts and managing applications")
@SecurityRequirement(name = "BearerAuth")
public class AccountApplicationController {

    private final AccountApplicationService applicationService;

    public AccountApplicationController(AccountApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @Operation(summary = "Apply for Account", description = "Submit a customer account application with idempotency guarantee")
    @PreAuthorize("hasAuthority('ACCOUNT_APPLY') or hasRole('CUSTOMER')")
    public ResponseEntity<AccountApplicationResponse> applyForAccount(
            @Parameter(description = "Idempotency key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody AccountApplicationRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        AccountApplicationResponse response = applicationService.apply(identitySubject, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/applications")
    @Operation(summary = "List My Account Applications", description = "List all account applications submitted by authenticated customer")
    @PreAuthorize("hasAuthority('ACCOUNT_APPLICATION_READ_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<CursorPagedResponse<AccountApplicationResponse>> listMyApplications(
            @Parameter(description = "Filter by application status") @RequestParam(required = false) ApplicationStatus status,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        CursorPagedResponse<AccountApplicationResponse> response = applicationService.listMyApplications(identitySubject, status, cursor, limit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/applications/{applicationId}")
    @Operation(summary = "Get Application Details", description = "View details of an account application with ownership verification")
    @PreAuthorize("hasAuthority('ACCOUNT_APPLICATION_READ_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<AccountApplicationResponse> getApplicationDetails(
            @Parameter(description = "Application Number ID") @PathVariable String applicationId,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        AccountApplicationResponse response = applicationService.getMyApplication(identitySubject, applicationId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/applications/{applicationId}/cancel")
    @Operation(summary = "Cancel Account Application", description = "Cancel an unapproved pending account application")
    @PreAuthorize("hasAuthority('ACCOUNT_APPLICATION_CANCEL_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<Void> cancelAccountApplication(
            @Parameter(description = "Application Number ID") @PathVariable String applicationId,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        applicationService.cancelMyApplication(identitySubject, applicationId);
        return ResponseEntity.ok().build();
    }
}
