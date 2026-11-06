package com.fintech.ledger.dto.request;

import com.fintech.ledger.enums.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record LedgerPostingRequest(
        @NotNull(message = "Transaction type is required")
        TransactionType transactionType,

        @NotBlank(message = "Currency is required")
        @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter ISO code")
        String currency,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        String correlationId,

        @NotBlank(message = "Debit ledger account ID is required")
        String debitLedgerAccountId,

        @NotBlank(message = "Credit ledger account ID is required")
        String creditLedgerAccountId,

        String narrative,

        String referenceNumber
) {}
