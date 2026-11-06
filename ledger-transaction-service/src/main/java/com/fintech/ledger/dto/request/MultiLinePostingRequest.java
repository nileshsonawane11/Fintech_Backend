package com.fintech.ledger.dto.request;

import com.fintech.ledger.enums.TransactionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record MultiLinePostingRequest(
        @NotNull(message = "Transaction type is required")
        TransactionType transactionType,

        @NotBlank(message = "Currency is required")
        @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter ISO code")
        String currency,

        String correlationId,

        String narrative,

        String referenceNumber,

        @NotEmpty(message = "Posting must contain at least two entries")
        List<@Valid PostingEntryItem> entries
) {}
