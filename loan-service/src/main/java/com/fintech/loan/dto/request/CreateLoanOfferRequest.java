package com.fintech.loan.dto.request;

import com.fintech.loan.enums.DiscountType;
import com.fintech.loan.enums.OfferStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record CreateLoanOfferRequest(
        @NotBlank(message = "Offer code is required")
        @Size(min = 3, max = 50, message = "Offer code must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_\\-]+$", message = "Offer code may only contain letters, digits, underscores, and hyphens")
        String offerCode,

        @NotBlank(message = "Offer name is required")
        @Size(max = 200)
        String offerName,

        String description,

        OfferStatus status,

        @NotNull(message = "validFrom is required")
        Instant validFrom,

        @NotNull(message = "validTo is required")
        Instant validTo,

        List<String> applicableProductCodes,
        Map<String, Object> eligibilityConditions,

        @NotNull(message = "Discount type is required")
        DiscountType discountType,

        @DecimalMin("0.00") @DecimalMax("20.00")
        BigDecimal interestRateDiscount,

        @DecimalMin("0.00") @DecimalMax("100.00")
        BigDecimal processingFeeDiscountPercentage,

        @DecimalMin("0.00")
        BigDecimal processingFeeWaiverAmount,

        @DecimalMin("0.00")
        BigDecimal cashbackAmount,

        @DecimalMin("0.00") @DecimalMax("25.00")
        BigDecimal cashbackPercentage,

        @DecimalMin("0.00")
        BigDecimal maxCashbackAmount,

        @Min(1)
        Integer priority
) {
}
