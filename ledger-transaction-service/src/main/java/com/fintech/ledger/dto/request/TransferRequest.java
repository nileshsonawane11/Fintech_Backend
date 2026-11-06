package com.fintech.ledger.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record TransferRequest(
        @NotBlank(message = "Source account ID is required")
        String sourceAccountId,

        @NotBlank(message = "Destination account ID is required")
        String destinationAccountId,

        @NotNull(message = "Transfer amount is required")
        @DecimalMin(value = "0.01", message = "Transfer amount must be greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter ISO code")
        String currency,

        String remarks,

        String reference
) {}
