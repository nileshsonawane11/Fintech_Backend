package com.fintech.loan.dto.response;

import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProcessingFeeType;
import com.fintech.loan.enums.ProductStatus;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class LoanProductResponses {

    private LoanProductResponses() {
    }

    public record LoanProductFeeResponse(
            UUID id,
            ProcessingFeeType processingFeeType,
            BigDecimal processingFeeValue,
            BigDecimal minimumProcessingFee,
            BigDecimal maximumProcessingFee,
            BigDecimal prepaymentChargePercentage,
            String prepaymentCharges,
            BigDecimal foreclosureChargePercentage,
            String foreclosureCharges,
            BigDecimal latePaymentPenalty,
            String latePaymentPenaltyDescription,
            BigDecimal chequeBounceCharges,
            Map<String, Object> additionalCharges
    ) {}

    public record AdminLoanProductResponse(
            UUID id,
            String productCode,
            String productName,
            String shortDescription,
            String detailedDescription,
            LoanCategory loanCategory,
            List<String> eligibleLoanPurposes,
            List<String> employmentTypes,
            ProductStatus status,
            boolean deleted,
            String currency,
            BigDecimal minimumLoanAmount,
            BigDecimal maximumLoanAmount,
            BigDecimal minimumInterestRate,
            BigDecimal maximumInterestRate,
            InterestCalculationMethod interestCalculationMethod,
            Integer minimumTenureMonths,
            Integer maximumTenureMonths,
            BigDecimal maximumLTVPercentage,
            BigDecimal minimumMonthlyIncome,
            BigDecimal maxFoirPercentage,
            boolean secured,
            boolean balanceTransferAllowed,
            boolean topUpAllowed,
            boolean stepUpEMIAllowed,
            Integer stepUpEMIDurationMonths,
            List<String> requiredDocuments,
            Map<String, Object> eligibilityRules,
            List<String> applicableOffers,
            LoanProductFeeResponse feesAndCharges,
            Instant createdAt,
            Instant updatedAt,
            String createdBy,
            String updatedBy,
            Long version
    ) {}

    public record PublicLoanProductDetailResponse(
            UUID id,
            String productCode,
            String productName,
            String shortDescription,
            String detailedDescription,
            LoanCategory loanCategory,
            List<String> eligibleLoanPurposes,
            List<String> employmentTypes,
            String currency,
            BigDecimal minimumLoanAmount,
            BigDecimal maximumLoanAmount,
            BigDecimal minimumInterestRate,
            BigDecimal maximumInterestRate,
            InterestCalculationMethod interestCalculationMethod,
            Integer minimumTenureMonths,
            Integer maximumTenureMonths,
            BigDecimal maximumLTVPercentage,
            BigDecimal minimumMonthlyIncome,
            BigDecimal maxFoirPercentage,
            boolean secured,
            boolean balanceTransferAllowed,
            boolean topUpAllowed,
            boolean stepUpEMIAllowed,
            Integer stepUpEMIDurationMonths,
            List<String> requiredDocuments,
            Map<String, Object> eligibilityRules,
            List<String> applicableOffers,
            LoanProductFeeResponse feesAndCharges
    ) {}

    public record InterestRateInfoResponse(
            String productCode,
            String productName,
            BigDecimal minimumInterestRate,
            BigDecimal maximumInterestRate,
            InterestCalculationMethod interestCalculationMethod,
            String currency
    ) {}

    public record ProductEligibilityResponse(
            String productCode,
            String productName,
            BigDecimal minimumLoanAmount,
            BigDecimal maximumLoanAmount,
            Integer minimumTenureMonths,
            Integer maximumTenureMonths,
            BigDecimal minimumMonthlyIncome,
            BigDecimal maxFoirPercentage,
            BigDecimal maximumLTVPercentage,
            List<String> employmentTypes,
            List<String> eligibleLoanPurposes,
            List<String> requiredDocuments,
            Map<String, Object> eligibilityRules
    ) {}

    public record PagedResponse<T>(
            List<T> content,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean last
    ) {
        public static <T> PagedResponse<T> of(Page<T> page) {
            return new PagedResponse<>(
                    page.getContent(),
                    page.getNumber(),
                    page.getSize(),
                    page.getTotalElements(),
                    page.getTotalPages(),
                    page.isLast()
            );
        }
    }
}
