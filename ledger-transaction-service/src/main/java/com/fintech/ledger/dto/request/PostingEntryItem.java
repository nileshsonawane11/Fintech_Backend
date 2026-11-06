package com.fintech.ledger.dto.request;

import com.fintech.ledger.enums.EntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PostingEntryItem(
        @NotBlank(message = "Ledger account ID is required")
        String ledgerAccountId,

        @NotNull(message = "Entry type is required")
        EntryType entryType,

        @NotNull(message = "Entry amount is required")
        @DecimalMin(value = "0.01", message = "Entry amount must be greater than zero")
        BigDecimal amount,

        String narrative,

        String referenceNumber
) {}
