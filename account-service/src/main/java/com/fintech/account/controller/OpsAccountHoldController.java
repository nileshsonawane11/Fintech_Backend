package com.fintech.account.controller;

import com.fintech.account.dto.request.CancelHoldRequest;
import com.fintech.account.dto.request.CreateHoldRequest;
import com.fintech.account.dto.request.ReleaseHoldRequest;
import com.fintech.account.dto.response.AccountHoldResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.service.AccountHoldService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping
@Tag(name = "Operations - Account Holds", description = "Operations endpoints for placing, inspecting, releasing, and cancelling account holds")
@SecurityRequirement(name = "BearerAuth")
public class OpsAccountHoldController {

    private final AccountHoldService holdService;

    public OpsAccountHoldController(AccountHoldService holdService) {
        this.holdService = holdService;
    }

    @PostMapping("/ops/api/v1/accounts/{accountId}/holds")
    @Operation(summary = "Place Account Hold", description = "Place a financial hold on an account with ledger reservation")
    @PreAuthorize("hasAuthority('ACCOUNT_HOLD_CREATE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<AccountHoldResponse> placeHold(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Parameter(description = "Idempotency key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateHoldRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String createdBy = jwt != null ? jwt.getSubject() : "OPS";
        AccountHoldResponse response = holdService.placeHold(accountId, idempotencyKey, request, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/ops/api/v1/accounts/{accountId}/holds")
    @Operation(summary = "List Account Holds", description = "List all holds placed on a specific account")
    @PreAuthorize("hasAuthority('ACCOUNT_HOLD_READ') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<CursorPagedResponse<AccountHoldResponse>> listAccountHolds(
            @Parameter(description = "Public Account ID") @PathVariable String accountId,
            @Parameter(description = "Filter by hold status") @RequestParam(required = false) HoldStatus status,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<AccountHoldResponse> response = holdService.listAccountHolds(accountId, status, cursor, limit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/ops/api/v1/holds/{holdId}")
    @Operation(summary = "Get Hold Details", description = "Retrieve full details of a specific hold")
    @PreAuthorize("hasAuthority('ACCOUNT_HOLD_READ') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<AccountHoldResponse> getHoldDetails(
            @Parameter(description = "Public Hold ID") @PathVariable String holdId) {

        AccountHoldResponse response = holdService.getHoldDetails(holdId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ops/api/v1/holds/{holdId}/release")
    @Operation(summary = "Release Account Hold", description = "Release an active hold and unblock funds in Ledger Service")
    @PreAuthorize("hasAuthority('ACCOUNT_HOLD_RELEASE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<AccountHoldResponse> releaseHold(
            @Parameter(description = "Public Hold ID") @PathVariable String holdId,
            @Valid @RequestBody ReleaseHoldRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String releasedBy = jwt != null ? jwt.getSubject() : "OPS";
        AccountHoldResponse response = holdService.releaseHold(holdId, request, releasedBy);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ops/api/v1/holds/{holdId}/cancel")
    @Operation(summary = "Cancel Account Hold", description = "Cancel a hold when permitted by business rules")
    @PreAuthorize("hasAuthority('ACCOUNT_HOLD_RELEASE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<Void> cancelHold(
            @Parameter(description = "Public Hold ID") @PathVariable String holdId,
            @Valid @RequestBody(required = false) CancelHoldRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String cancelledBy = jwt != null ? jwt.getSubject() : "OPS";
        CancelHoldRequest req = request != null ? request : new CancelHoldRequest("Cancelled by operations");
        holdService.cancelHold(holdId, req, cancelledBy);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/ops/api/v1/holds")
    @Operation(summary = "List Holds for Operations", description = "Global search across all bank account holds")
    @PreAuthorize("hasAuthority('ACCOUNT_HOLD_READ') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<CursorPagedResponse<AccountHoldResponse>> listOpsHolds(
            @Parameter(description = "Filter by account ID") @RequestParam(required = false) String accountId,
            @Parameter(description = "Filter by customer ID") @RequestParam(required = false) String customerId,
            @Parameter(description = "Filter by status") @RequestParam(required = false) HoldStatus status,
            @Parameter(description = "Filter by reason code") @RequestParam(required = false) String reasonCode,
            @Parameter(description = "Filter created from") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromDate,
            @Parameter(description = "Filter created to") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toDate,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<AccountHoldResponse> response = holdService.listOpsHolds(
                accountId, customerId, status, reasonCode, fromDate, toDate, cursor, limit);
        return ResponseEntity.ok(response);
    }
}
