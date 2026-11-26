package com.fintech.loan.dto.response;

import com.fintech.loan.enums.DiscountType;
import com.fintech.loan.enums.OfferStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class DynamicOfferResponses {

    private DynamicOfferResponses() {
    }

    public record DynamicOfferResponse(
            UUID id,
            String offerCode,
            String offerName,
            String description,
            OfferStatus status,
            Integer currentVersion,
            Instant validFrom,
            Instant validTo,
            Instant activatedAt,
            List<String> applicableProductCodes,
            Map<String, Object> eligibilityConditions,
            DiscountType discountType,
            BigDecimal interestRateDiscount,
            BigDecimal processingFeeDiscountPercentage,
            BigDecimal processingFeeWaiverAmount,
            BigDecimal cashbackAmount,
            BigDecimal cashbackPercentage,
            BigDecimal maxCashbackAmount,
            Integer priority,
            Instant createdAt,
            Instant updatedAt,
            String createdBy,
            String updatedBy
    ) {}

    public record OfferVersionResponse(
            UUID id,
            UUID offerId,
            String offerCode,
            Integer versionNumber,
            OfferStatus status,
            Instant validFrom,
            Instant validTo,
            List<String> applicableProductCodes,
            Map<String, Object> eligibilityConditions,
            DiscountType discountType,
            BigDecimal interestRateDiscount,
            BigDecimal processingFeeDiscountPercentage,
            BigDecimal processingFeeWaiverAmount,
            BigDecimal cashbackAmount,
            BigDecimal cashbackPercentage,
            BigDecimal maxCashbackAmount,
            String createdBy,
            Instant createdAt
    ) {}

    public record ApplicationOfferSnapshotResponse(
            UUID id,
            String loanApplicationId,
            UUID offerId,
            String offerCode,
            String offerName,
            Integer offerVersion,
            DiscountType discountType,
            BigDecimal interestRateDiscount,
            BigDecimal processingFeeDiscountPercentage,
            BigDecimal processingFeeWaiverAmount,
            BigDecimal cashbackAmount,
            BigDecimal effectiveInterestRate,
            BigDecimal originalProcessingFee,
            BigDecimal discountedProcessingFee,
            Map<String, Object> benefitDetails,
            Instant appliedAt
    ) {}
}
