package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.DepositRequest;
import com.fintech.ledger.dto.request.RejectActionRequest;
import com.fintech.ledger.dto.request.VerifyDepositRequest;
import com.fintech.ledger.dto.response.DepositResponse;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.DepositService;
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
@Tag(name = "Deposits", description = "Deposit initiation, bank settlement crediting, and operations verification")
@SecurityRequirement(name = "BearerAuth")
public class DepositController {

    private final DepositService depositService;

    public DepositController(DepositService depositService) {
        this.depositService = depositService;
    }

    @PostMapping("/api/v1/deposits")
    @Operation(summary = "Initiate Deposit", description = "Initiate deposit to a customer account via BANK_TRANSFER, CASH, CHEQUE, or INITIAL_FUNDING")
    @PreAuthorize("hasAuthority('ACCOUNT_DEPOSIT_CREATE_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<DepositResponse> initiateDeposit(
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Parameter(description = "Correlation ID", required = false)
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId,
            @Valid @RequestBody DepositRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        DepositResponse response = depositService.initiateDeposit(request, customerSubject, idempotencyKey, correlationId);
        HttpStatus status = response.status() == com.fintech.ledger.enums.TransactionStatus.PENDING
                ? HttpStatus.ACCEPTED : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/api/v1/deposits/{transactionId}")
    @Operation(summary = "Get Deposit Details", description = "Check deposit processing and settlement status")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<DepositResponse> getDepositDetails(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        DepositResponse response = depositService.getDepositDetails(transactionId, customerSubject, isOps);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ops/api/v1/deposits/{transactionId}/verify")
    @Operation(summary = "Verify Deposit (Operations)", description = "Operations verification of pending cash or cheque deposits with ledger posting commitment")
    @PreAuthorize("hasAuthority('DEPOSIT_VERIFY') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<DepositResponse> verifyDeposit(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @RequestBody(required = false) VerifyDepositRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        DepositResponse response = depositService.verifyDeposit(transactionId, request, opsUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ops/api/v1/deposits/{transactionId}/reject")
    @Operation(summary = "Reject Deposit (Operations)", description = "Operations rejection of unverified deposit requests")
    @PreAuthorize("hasAuthority('DEPOSIT_REJECT') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<DepositResponse> rejectDeposit(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @Valid @RequestBody RejectActionRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        DepositResponse response = depositService.rejectDeposit(transactionId, request, opsUser);
        return ResponseEntity.ok(response);
    }
}
