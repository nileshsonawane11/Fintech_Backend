package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.PlaceHoldRequest;
import com.fintech.ledger.dto.request.ReleaseHoldRequest;
import com.fintech.ledger.dto.response.AccountHoldResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.enums.HoldStatus;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.HoldService;
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
import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Holds", description = "Financial hold reservations and unblocking of funds")
@SecurityRequirement(name = "BearerAuth")
public class HoldController {

    private final HoldService holdService;

    public HoldController(HoldService holdService) {
        this.holdService = holdService;
    }

    @PostMapping("/internal/api/v1/ledger/accounts/{accountId}/holds")
    @Operation(summary = "Place Hold (Internal)", description = "Internal service API to reserve funds on an account without creating posted ledger entries")
    @PreAuthorize("hasAuthority('LEDGER_HOLD_CREATE_INTERNAL') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN')")
    public ResponseEntity<AccountHoldResponse> placeHold(
            @Parameter(description = "Account Reference or Ledger Account ID") @PathVariable String accountId,
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody PlaceHoldRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String createdBy = jwt != null ? jwt.getSubject() : "INTERNAL_SERVICE";
        AccountHoldResponse response = holdService.placeHold(accountId, request, createdBy, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/api/v1/holds/reserve")
    @Operation(summary = "Reserve Hold Funds (Compatibility)", description = "Inter-service compatibility endpoint used by Account Service client")
    @PreAuthorize("hasAuthority('LEDGER_HOLD_CREATE_INTERNAL') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN')")
    public ResponseEntity<AccountHoldResponse> reserveHoldCompatibility(
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody PlaceHoldRequest request) {

        AccountHoldResponse response = holdService.placeHold(request.accountId(), request, "ACCOUNT_SERVICE", idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/internal/api/v1/ledger/holds/{holdId}")
    @Operation(summary = "Get Hold Details (Internal)", description = "Internal service API to inspect financial hold reservation details")
    @PreAuthorize("hasAuthority('LEDGER_HOLD_CREATE_INTERNAL') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN')")
    public ResponseEntity<AccountHoldResponse> getHoldInternal(
            @Parameter(description = "Hold ID") @PathVariable String holdId) {

        AccountHoldResponse response = holdService.getHold(holdId, null, true);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/accounts/{accountId}/holds")
    @Operation(summary = "List Account Holds", description = "Customer endpoint to view active financial holds placed on their account")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<List<AccountHoldResponse>> listAccountHolds(
            @Parameter(description = "Account ID") @PathVariable String accountId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        List<AccountHoldResponse> list = holdService.listAccountHolds(accountId, customerSubject, isOps);
        return ResponseEntity.ok(list);
    }

    @PostMapping({"/internal/api/v1/ledger/holds/{holdId}/release", "/api/v1/holds/release"})
    @Operation(summary = "Release Hold", description = "Release an active financial hold, restoring available balance")
    @PreAuthorize("hasAuthority('LEDGER_HOLD_RELEASE_INTERNAL') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN') or hasRole('OPERATIONS')")
    public ResponseEntity<AccountHoldResponse> releaseHold(
            @PathVariable(required = false) String holdId,
            @RequestBody(required = false) ReleaseHoldRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String targetHoldId = holdId != null ? holdId : (request != null ? request.holdId() : null);
        String releasedBy = jwt != null ? jwt.getSubject() : "INTERNAL_SERVICE";
        AccountHoldResponse response = holdService.releaseHold(targetHoldId, request, releasedBy);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/ops/api/v1/holds")
    @Operation(summary = "List Holds (Operations)", description = "Operations query across all account financial holds bank-wide")
    @PreAuthorize("hasAuthority('HOLD_READ_ALL') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CursorPagedResponse<AccountHoldResponse>> listOpsHolds(
            @Parameter(description = "Filter by account reference") @RequestParam(required = false) String accountId,
            @Parameter(description = "Filter by customer ID") @RequestParam(required = false) UUID customerId,
            @Parameter(description = "Filter by status") @RequestParam(required = false) HoldStatus status,
            @Parameter(description = "Filter by reason code") @RequestParam(required = false) String reasonCode,
            @Parameter(description = "Filter from date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromDate,
            @Parameter(description = "Filter to date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toDate,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<AccountHoldResponse> response = holdService.listOpsHolds(
                accountId, customerId, status, reasonCode, fromDate, toDate, limit, cursor);
        return ResponseEntity.ok(response);
    }
}
