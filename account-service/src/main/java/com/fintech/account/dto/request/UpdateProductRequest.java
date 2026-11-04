package com.fintech.account.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record UpdateProductRequest(
        @NotBlank(message = "Product name is required")
        @Size(max = 100, message = "Product name must not exceed 100 characters")
        String productName,

        @Size(max = 1000, message = "Description must not exceed 1000 characters")
        String description,

        @NotNull(message = "Minimum balance is required")
        @DecimalMin(value = "0.00", message = "Minimum balance cannot be negative")
        BigDecimal minimumBalance,

        @NotNull(message = "Minimum initial funding is required")
        @DecimalMin(value = "0.00", message = "Minimum initial funding cannot be negative")
        BigDecimal minimumInitialFunding,

        @NotNull(message = "Interest rate is required")
        @DecimalMin(value = "0.00", message = "Interest rate cannot be negative")
        @DecimalMax(value = "100.00", message = "Interest rate cannot exceed 100%")
        BigDecimal interestRate,

        @NotNull(message = "Daily transfer limit is required")
        @DecimalMin(value = "0.00", message = "Daily transfer limit cannot be negative")
        BigDecimal dailyTransferLimit,

        @NotNull(message = "Monthly transfer limit is required")
        @DecimalMin(value = "0.00", message = "Monthly transfer limit cannot be negative")
        BigDecimal monthlyTransferLimit,

        @NotNull(message = "Minimum age is required")
        @Min(value = 0, message = "Minimum age cannot be negative")
        @Max(value = 120, message = "Invalid minimum age")
        Integer minimumAge,

        @Min(value = 0, message = "Maximum age cannot be negative")
        @Max(value = 150, message = "Invalid maximum age")
        Integer maximumAge,

        Boolean requiresKyc
) {}
