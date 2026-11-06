package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.TransferRequest;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.TransferResponse;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.TransferService;
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
@RequestMapping("/api/v1/transfers")
@Tag(name = "Transfers", description = "Customer fund transfers between bank accounts with double-entry ledger execution")
@SecurityRequirement(name = "BearerAuth")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    @Operation(summary = "Initiate Fund Transfer", description = "Initiate an atomic fund transfer between two bank accounts with idempotency and balance validation")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSFER_CREATE_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<TransferResponse> initiateTransfer(
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Parameter(description = "Correlation ID", required = false)
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId,
            @Valid @RequestBody TransferRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        TransferResponse response = transferService.initiateTransfer(request, customerSubject, idempotencyKey, correlationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{transactionId}")
    @Operation(summary = "Get Transfer Details", description = "Retrieve transfer information and source/destination account references")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<TransferResponse> getTransferDetails(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        TransferResponse response = transferService.getTransferDetails(transactionId, customerSubject, isOps);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "List Transfers", description = "List fund transfers initiated by or involving the customer")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<CursorPagedResponse<TransferResponse>> listTransfers(
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        CursorPagedResponse<TransferResponse> response = transferService.listTransfers(customerSubject, isOps, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{transactionId}/cancel")
    @Operation(summary = "Cancel Pending Transfer", description = "Cancel a transfer that has not yet been financially posted to the ledger")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSFER_CREATE_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<Void> cancelPendingTransfer(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        transferService.cancelPendingTransfer(transactionId, customerSubject);
        return ResponseEntity.ok().build();
    }
}
