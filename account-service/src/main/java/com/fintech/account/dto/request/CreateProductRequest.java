package com.fintech.account.dto.request;

import com.fintech.account.enums.AccountType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record CreateProductRequest(
        // Core account configuration fields
        @NotBlank(message = "Product code is required")
        @Pattern(regexp = "^[A-Z0-9_]{3,50}$", message = "Product code must be uppercase letters, numbers, and underscores (3-50 chars)")
        String productCode,

        @NotBlank(message = "Product name is required")
        @Size(max = 100, message = "Product name must not exceed 100 characters")
        String productName,

        @Size(max = 1000, message = "Description must not exceed 1000 characters")
        String description,

        @NotNull(message = "Account type is required")
        AccountType accountType,

        @NotBlank(message = "Currency is required")
        @Size(min = 3, max = 3, message = "Currency must be 3-letter ISO code")
        String currency,

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

        Boolean requiresKyc,

        Boolean active,

        // Product identification & content
        @Size(max = 100, message = "Slug must not exceed 100 characters")
        String slug,

        @Size(max = 50, message = "Category must not exceed 50 characters")
        String category,

        @Size(max = 255, message = "Tagline must not exceed 255 characters")
        String tagline,

        @Size(max = 30, message = "Status must not exceed 30 characters")
        String status,

        String interestNote,

        // Product configuration (JSONB)
        Map<String, Object> amb,

        Map<String, Object> fees,

        List<Map<String, Object>> charges,

        // Product information lists (JSONB)
        List<String> documents,

        List<String> eligibility,

        List<Map<String, Object>> faqs,

        List<String> features,

        List<String> howToApply,

        // Interest rate configuration (JSONB)
        List<Map<String, Object>> rateSlabs
) {
    public CreateProductRequest(
            String productCode,
            String productName,
            String description,
            AccountType accountType,
            String currency,
            BigDecimal minimumBalance,
            BigDecimal minimumInitialFunding,
            BigDecimal interestRate,
            BigDecimal dailyTransferLimit,
            BigDecimal monthlyTransferLimit,
            Integer minimumAge,
            Integer maximumAge,
            Boolean requiresKyc,
            Boolean active
    ) {
        this(
                productCode, productName, description, accountType, currency,
                minimumBalance, minimumInitialFunding, interestRate,
                dailyTransferLimit, monthlyTransferLimit, minimumAge, maximumAge,
                requiresKyc, active,
                null, null, null, null, null,
                null, null, null,
                null, null, null, null, null,
                null
        );
    }
}
