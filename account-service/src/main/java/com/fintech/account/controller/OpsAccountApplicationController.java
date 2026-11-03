package com.fintech.account.controller;

import com.fintech.account.dto.request.ApproveApplicationRequest;
import com.fintech.account.dto.request.RejectApplicationRequest;
import com.fintech.account.dto.response.AccountApplicationResponse;
import com.fintech.account.dto.response.ApplicationApprovalResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.enums.ApplicationStatus;
import com.fintech.account.service.AccountApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/ops/api/v1/account-applications")
@Tag(name = "Operations - Account Applications", description = "Operations endpoints for reviewing, approving, and rejecting account applications")
@SecurityRequirement(name = "BearerAuth")
public class OpsAccountApplicationController {

    private final AccountApplicationService applicationService;

    public OpsAccountApplicationController(AccountApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    @Operation(summary = "List Applications (Operations)", description = "Search and list customer account applications for bank operations staff")
    @PreAuthorize("hasAuthority('ACCOUNT_APPLICATION_READ_ALL') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CursorPagedResponse<AccountApplicationResponse>> listApplications(
            @Parameter(description = "Filter by status") @RequestParam(required = false) ApplicationStatus status,
            @Parameter(description = "Filter by customer ID") @RequestParam(required = false) String customerId,
            @Parameter(description = "Filter by product code") @RequestParam(required = false) String productCode,
            @Parameter(description = "Filter submitted from") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromDate,
            @Parameter(description = "Filter submitted to") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toDate,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<AccountApplicationResponse> response = applicationService.listOpsApplications(
                status, customerId, productCode, fromDate, toDate, cursor, limit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{applicationId}")
    @Operation(summary = "Get Application Details (Operations)", description = "View full details of a customer account application")
    @PreAuthorize("hasAuthority('ACCOUNT_APPLICATION_READ_ALL') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<AccountApplicationResponse> getApplicationDetails(
            @Parameter(description = "Application number ID") @PathVariable String applicationId) {

        AccountApplicationResponse response = applicationService.getOpsApplication(applicationId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{applicationId}/approve")
    @Operation(summary = "Approve Application (Operations)", description = "Approve account application, create bank account, and emit domain events")
    @PreAuthorize("hasAuthority('ACCOUNT_APPLICATION_APPROVE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<ApplicationApprovalResponse> approveApplication(
            @Parameter(description = "Application number ID") @PathVariable String applicationId,
            @Parameter(description = "Idempotency key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody(required = false) ApproveApplicationRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String approvedBy = jwt != null ? jwt.getSubject() : "OPS";
        ApproveApplicationRequest req = request != null ? request : new ApproveApplicationRequest("Approved");
        ApplicationApprovalResponse response = applicationService.approveApplication(applicationId, approvedBy, idempotencyKey, req);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{applicationId}/reject")
    @Operation(summary = "Reject Application (Operations)", description = "Reject customer account application with reason code")
    @PreAuthorize("hasAuthority('ACCOUNT_APPLICATION_REJECT') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<Void> rejectApplication(
            @Parameter(description = "Application number ID") @PathVariable String applicationId,
            @Valid @RequestBody RejectApplicationRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String rejectedBy = jwt != null ? jwt.getSubject() : "OPS";
        applicationService.rejectApplication(applicationId, rejectedBy, request);
        return ResponseEntity.ok().build();
    }
}
