package com.fintech.account.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AccountApplicationRequest(
        @NotBlank(message = "Product code is required")
        String productCode,

        @NotNull(message = "Initial funding amount is required")
        @DecimalMin(value = "0.00", message = "Initial funding amount cannot be negative")
        BigDecimal initialFundingAmount,

        @Valid
        NomineeRequest nominee
) {}
