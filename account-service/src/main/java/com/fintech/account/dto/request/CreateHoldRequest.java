package com.fintech.account.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateHoldRequest(
        @NotNull(message = "Hold amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Reason code is required")
        String reasonCode,

        @Size(max = 500, message = "Remarks must not exceed 500 characters")
        String remarks
) {}
