package com.fintech.ledger.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PlaceHoldRequest(
        String accountId,

        String holdId,

        @NotNull(message = "Hold amount is required")
        @DecimalMin(value = "0.01", message = "Hold amount must be greater than zero")
        BigDecimal amount,

        String currency,

        String reasonCode,

        String remarks,

        String referenceNumber
) {}
