package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.ReverseTransactionRequest;
import com.fintech.ledger.dto.response.ReversalResponse;
import com.fintech.ledger.service.ReversalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/api/v1/ledger")
@Tag(name = "Internal Ledger Reversals", description = "Trusted inter-service double-entry compensating reversal API")
@SecurityRequirement(name = "BearerAuth")
public class InternalLedgerReversalController {

    private final ReversalService reversalService;

    public InternalLedgerReversalController(ReversalService reversalService) {
        this.reversalService = reversalService;
    }

    @PostMapping("/transactions/{transactionId}/reverse")
    @Operation(summary = "Reverse Transaction (Internal)", description = "Internal service API to post compensating inverted debit/credit entries for a failed external payment")
    @PreAuthorize("hasAuthority('LEDGER_POSTING_CREATE') or hasRole('SYSTEM') or hasRole('INTERNAL') or hasRole('ADMIN')")
    public ResponseEntity<ReversalResponse> reverseTransactionInternal(
            @Parameter(description = "Transaction ID") @PathVariable String transactionId,
            @Parameter(description = "Idempotency Key UUID", required = false)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody ReverseTransactionRequest request) {

        ReversalResponse response = reversalService.reverseTransaction(
                transactionId, request, "INTERNAL_PAYMENT_SERVICE", idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
