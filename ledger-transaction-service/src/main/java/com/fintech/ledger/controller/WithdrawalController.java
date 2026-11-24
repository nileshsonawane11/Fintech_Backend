package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.ApproveWithdrawalRequest;
import com.fintech.ledger.dto.request.RejectActionRequest;
import com.fintech.ledger.dto.request.WithdrawalRequest;
import com.fintech.ledger.dto.response.WithdrawalResponse;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.WithdrawalService;
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
@Tag(name = "Withdrawals", description = "Withdrawal initiation, payout processing, and operational approval workflows")
@SecurityRequirement(name = "BearerAuth")
public class WithdrawalController {

    private final WithdrawalService withdrawalService;

    public WithdrawalController(WithdrawalService withdrawalService) {
        this.withdrawalService = withdrawalService;
    }

    @PostMapping("/api/v1/withdrawals")
    @Operation(summary = "Initiate Withdrawal", description = "Initiate fund withdrawal from customer account via ATM, CASH, BANK_TRANSFER, or CHEQUE")
    @PreAuthorize("hasAuthority('ACCOUNT_WITHDRAWAL_CREATE_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<WithdrawalResponse> initiateWithdrawal(
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Parameter(description = "Correlation ID", required = false)
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId,
            @Valid @RequestBody WithdrawalRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedIdentitySubject();
        WithdrawalResponse response = withdrawalService.initiateWithdrawal(request, customerSubject, idempotencyKey, correlationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/v1/withdrawals/{transactionId}")
    @Operation(summary = "Get Withdrawal Details", description = "Check payout execution and settlement status")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<WithdrawalResponse> getWithdrawalDetails(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedIdentitySubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        WithdrawalResponse response = withdrawalService.getWithdrawalDetails(transactionId, customerSubject, isOps);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ops/api/v1/withdrawals/{transactionId}/approve")
    @Operation(summary = "Approve Withdrawal (Operations)", description = "Operations approval of high-value or manual payout withdrawals")
    @PreAuthorize("hasAuthority('WITHDRAWAL_APPROVE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<WithdrawalResponse> approveWithdrawal(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @RequestBody(required = false) ApproveWithdrawalRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedIdentitySubject();
        WithdrawalResponse response = withdrawalService.approveWithdrawal(transactionId, request, opsUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ops/api/v1/withdrawals/{transactionId}/reject")
    @Operation(summary = "Reject Withdrawal (Operations)", description = "Operations rejection of pending withdrawals")
    @PreAuthorize("hasAuthority('WITHDRAWAL_REJECT') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<WithdrawalResponse> rejectWithdrawal(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @Valid @RequestBody RejectActionRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedIdentitySubject();
        WithdrawalResponse response = withdrawalService.rejectWithdrawal(transactionId, request, opsUser);
        return ResponseEntity.ok(response);
    }
}
