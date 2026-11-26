package com.fintech.loan.dto.request;

import com.fintech.loan.enums.DiscountType;
import com.fintech.loan.enums.OfferStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record UpdateLoanOfferRequest(
        @Size(max = 200) String offerName,
        String description,
        OfferStatus status,
        Instant validFrom,
        Instant validTo,
        List<String> applicableProductCodes,
        Map<String, Object> eligibilityConditions,
        DiscountType discountType,
        @DecimalMin("0.00") @DecimalMax("20.00") BigDecimal interestRateDiscount,
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal processingFeeDiscountPercentage,
        @DecimalMin("0.00") BigDecimal processingFeeWaiverAmount,
        @DecimalMin("0.00") BigDecimal cashbackAmount,
        @DecimalMin("0.00") @DecimalMax("25.00") BigDecimal cashbackPercentage,
        @DecimalMin("0.00") BigDecimal maxCashbackAmount,
        @Min(1) Integer priority
) {
}
