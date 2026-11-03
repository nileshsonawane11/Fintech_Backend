package com.fintech.account.controller;

import com.fintech.account.dto.request.NomineeRequest;
import com.fintech.account.dto.response.AccountNomineeResponse;
import com.fintech.account.security.SecurityUtils;
import com.fintech.account.service.NomineeService;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/nominees")
@Tag(name = "Customer - Nominees", description = "Endpoints for managing bank account nominees")
@SecurityRequirement(name = "BearerAuth")
public class AccountNomineeController {

    private final NomineeService nomineeService;

    public AccountNomineeController(NomineeService nomineeService) {
        this.nomineeService = nomineeService;
    }

    @PostMapping
    @Operation(summary = "Add Nominee", description = "Add a nominee to a bank account with ownership and allocation validation")
    @PreAuthorize("hasAuthority('ACCOUNT_NOMINEE_CREATE_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<AccountNomineeResponse> addNominee(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Valid @RequestBody NomineeRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        AccountNomineeResponse response = nomineeService.addNominee(identitySubject, accountId, request, identitySubject);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List Nominees", description = "List all nominees registered for a specific bank account")
    @PreAuthorize("hasAuthority('ACCOUNT_NOMINEE_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<List<AccountNomineeResponse>> listNominees(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        List<AccountNomineeResponse> response = nomineeService.listNominees(identitySubject, accountId, isOps);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{nomineeId}")
    @Operation(summary = "Get Nominee Details", description = "View details of a specific nominee")
    @PreAuthorize("hasAuthority('ACCOUNT_NOMINEE_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<AccountNomineeResponse> getNominee(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Parameter(description = "Nominee UUID") @PathVariable UUID nomineeId,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        AccountNomineeResponse response = nomineeService.getNominee(identitySubject, accountId, nomineeId, isOps);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{nomineeId}")
    @Operation(summary = "Update Nominee", description = "Update details or allocation percentage of an existing nominee")
    @PreAuthorize("hasAuthority('ACCOUNT_NOMINEE_UPDATE_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<AccountNomineeResponse> updateNominee(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Parameter(description = "Nominee UUID") @PathVariable UUID nomineeId,
            @Valid @RequestBody NomineeRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        AccountNomineeResponse response = nomineeService.updateNominee(identitySubject, accountId, nomineeId, request, identitySubject);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{nomineeId}")
    @Operation(summary = "Delete Nominee", description = "Remove a nominee from an active bank account")
    @PreAuthorize("hasAuthority('ACCOUNT_NOMINEE_DELETE_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<Void> deleteNominee(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Parameter(description = "Nominee UUID") @PathVariable UUID nomineeId,
            @AuthenticationPrincipal Jwt jwt) {

        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        nomineeService.deleteNominee(identitySubject, accountId, nomineeId, identitySubject);
        return ResponseEntity.noContent().build();
    }
}
