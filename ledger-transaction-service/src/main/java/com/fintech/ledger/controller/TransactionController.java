package com.fintech.ledger.controller;

import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.TransactionReceiptResponse;
import com.fintech.ledger.dto.response.TransactionResponse;
import com.fintech.ledger.enums.TransactionDirection;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@Tag(name = "Transactions", description = "Customer transaction stream, transaction details, and receipts")
@SecurityRequirement(name = "BearerAuth")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping("/api/v1/accounts/{accountId}/transactions")
    @Operation(summary = "List Account Transactions", description = "Query customer transaction history with filters, cursor pagination, and debit/credit directions")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<CursorPagedResponse<TransactionResponse>> listAccountTransactions(
            @Parameter(description = "Account ID (e.g. ACC-1001)") @PathVariable String accountId,
            @Parameter(description = "Filter from date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "Filter to date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @Parameter(description = "Filter by transaction type") @RequestParam(required = false) TransactionType transactionType,
            @Parameter(description = "Filter by transaction status") @RequestParam(required = false) TransactionStatus status,
            @Parameter(description = "Filter by direction (DEBIT/CREDIT)") @RequestParam(required = false) TransactionDirection direction,
            @Parameter(description = "Filter by minimum amount") @RequestParam(required = false) BigDecimal minAmount,
            @Parameter(description = "Filter by maximum amount") @RequestParam(required = false) BigDecimal maxAmount,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        CursorPagedResponse<TransactionResponse> response = transactionService.getAccountTransactions(
                accountId, customerSubject, isOps, fromDate, toDate, transactionType, status, direction, minAmount, maxAmount, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/transactions/{transactionId}")
    @Operation(summary = "Get Transaction Details", description = "Retrieve full lifecycle and posting details for a specific transaction")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<TransactionResponse> getTransactionDetails(
            @Parameter(description = "Transaction ID (e.g. TXN-554433)") @PathVariable String transactionId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        TransactionResponse response = transactionService.getTransactionDetails(transactionId, customerSubject, isOps);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/transactions/{transactionId}/receipt")
    @Operation(summary = "Get Transaction Receipt", description = "Generate an authenticated structured receipt for successful financial transactions")
    @PreAuthorize("hasAuthority('TRANSACTION_RECEIPT_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<TransactionReceiptResponse> getTransactionReceipt(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isOps = SecurityUtils.isOperationsOrAdmin();
        TransactionReceiptResponse response = transactionService.getTransactionReceipt(transactionId, customerSubject, isOps);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/transactions")
    @Operation(summary = "List Customer Transactions", description = "Query all transactions belonging to the authenticated customer across all accounts")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER')")
    public ResponseEntity<CursorPagedResponse<TransactionResponse>> listCustomerTransactions(
            @Parameter(description = "Filter by specific account ID") @RequestParam(required = false) String accountId,
            @Parameter(description = "Filter from date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "Filter to date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @Parameter(description = "Filter by transaction type") @RequestParam(required = false) TransactionType transactionType,
            @Parameter(description = "Filter by status") @RequestParam(required = false) TransactionStatus status,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor,
            @AuthenticationPrincipal Jwt jwt) {

        String customerSubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        CursorPagedResponse<TransactionResponse> response = transactionService.getCustomerTransactions(
                customerSubject, accountId, fromDate, toDate, transactionType, status, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/ops/api/v1/transactions")
    @Operation(summary = "Operations Transaction Search", description = "Operations endpoint to search transactions bank-wide with multi-criteria filters")
    @PreAuthorize("hasAuthority('TRANSACTION_SEARCH') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CursorPagedResponse<TransactionResponse>> searchOperationsTransactions(
            @Parameter(description = "Filter by transaction ID") @RequestParam(required = false) String transactionId,
            @Parameter(description = "Filter by account ID") @RequestParam(required = false) String accountId,
            @Parameter(description = "Filter by customer ID") @RequestParam(required = false) UUID customerId,
            @Parameter(description = "Filter by reference number") @RequestParam(required = false) String referenceNumber,
            @Parameter(description = "Filter by transaction type") @RequestParam(required = false) TransactionType transactionType,
            @Parameter(description = "Filter by status") @RequestParam(required = false) TransactionStatus status,
            @Parameter(description = "Filter from date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "Filter to date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @Parameter(description = "Filter min amount") @RequestParam(required = false) BigDecimal minAmount,
            @Parameter(description = "Filter max amount") @RequestParam(required = false) BigDecimal maxAmount,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<TransactionResponse> response = transactionService.searchOperationsTransactions(
                transactionId, accountId, customerId, referenceNumber, transactionType, status, fromDate, toDate, minAmount, maxAmount, limit, cursor);
        return ResponseEntity.ok(response);
    }
}
