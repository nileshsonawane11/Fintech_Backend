package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.ReverseTransactionRequest;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.ReversalResponse;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.ReversalService;
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
@Tag(name = "Reversals", description = "Compensating financial postings and reversal audit history")
@SecurityRequirement(name = "BearerAuth")
public class ReversalController {

    private final ReversalService reversalService;

    public ReversalController(ReversalService reversalService) {
        this.reversalService = reversalService;
    }

    @PostMapping("/ops/api/v1/transactions/{transactionId}/reverse")
    @Operation(summary = "Reverse Transaction (Operations)", description = "Post compensating inverted debit/credit entries to reverse a posted transaction")
    @PreAuthorize("hasAuthority('TRANSACTION_REVERSE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<ReversalResponse> reverseTransaction(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody ReverseTransactionRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String opsUser = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        ReversalResponse response = reversalService.reverseTransaction(transactionId, request, opsUser, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/v1/transactions/{transactionId}/reversal")
    @Operation(summary = "Get Reversal Details", description = "Check if a transaction has an associated compensating reversal")
    @PreAuthorize("hasAuthority('ACCOUNT_TRANSACTION_READ_OWN') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<ReversalResponse> getReversalDetails(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId) {

        ReversalResponse response = reversalService.getReversalDetails(transactionId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/ops/api/v1/reversals")
    @Operation(summary = "List Reversals (Operations)", description = "Audit trail of all transaction reversals executed across the system")
    @PreAuthorize("hasAuthority('TRANSACTION_READ_ALL') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CursorPagedResponse<ReversalResponse>> listReversals(
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<ReversalResponse> response = reversalService.listReversals(limit, cursor);
        return ResponseEntity.ok(response);
    }
}
