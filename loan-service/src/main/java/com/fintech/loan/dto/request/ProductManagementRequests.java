package com.fintech.loan.dto.request;

import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.ProductStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public final class ProductManagementRequests {

    private ProductManagementRequests() {
    }

    public record ProductStatusUpdateRequest(
            @NotNull(message = "Product status is required")
            ProductStatus status
    ) {}

    public record UpdateFinancialTermsAndChargesRequest(
            @DecimalMin("1000.00") BigDecimal minimumLoanAmount,
            @DecimalMin("1000.00") BigDecimal maximumLoanAmount,
            @DecimalMin("0.01") @DecimalMax("50.00") BigDecimal minimumInterestRate,
            @DecimalMin("0.01") @DecimalMax("50.00") BigDecimal maximumInterestRate,
            InterestCalculationMethod interestCalculationMethod,
            @Min(1) Integer minimumTenureMonths,
            @Max(480) Integer maximumTenureMonths,
            @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal maximumLTVPercentage,
            @DecimalMin("0.00") BigDecimal minimumMonthlyIncome,
            @DecimalMin("10.00") @DecimalMax("90.00") BigDecimal maxFoirPercentage,
            @Valid LoanProductFeeRequest feesAndCharges
    ) {}

    public record UpdateRequiredDocumentsRequest(
            @NotNull(message = "Required documents list is required")
            List<String> requiredDocuments
    ) {}

    public record UpdateEligibilityRequest(
            @DecimalMin("0.00") BigDecimal minimumMonthlyIncome,
            @DecimalMin("10.00") @DecimalMax("90.00") BigDecimal maxFoirPercentage,
            @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal maximumLTVPercentage,
            List<String> employmentTypes,
            List<String> eligibleLoanPurposes,
            Map<String, Object> eligibilityRules
    ) {}

    public record UpdateProductOffersRequest(
            @NotNull(message = "Applicable offers list is required")
            List<String> applicableOffers
    ) {}
}
