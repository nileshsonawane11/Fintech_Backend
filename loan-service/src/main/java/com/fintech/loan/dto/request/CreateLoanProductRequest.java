package com.fintech.loan.dto.request;

import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProductStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record CreateLoanProductRequest(
        @NotBlank(message = "Product code is required")
        @Size(min = 3, max = 50, message = "Product code must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_\\-]+$", message = "Product code may only contain letters, digits, underscores, and hyphens")
        String productCode,

        @NotBlank(message = "Product name is required")
        @Size(max = 200, message = "Product name must not exceed 200 characters")
        String productName,

        @Size(max = 500)
        String shortDescription,

        String detailedDescription,

        @NotNull(message = "Loan category is required")
        LoanCategory loanCategory,

        List<String> eligibleLoanPurposes,
        List<String> employmentTypes,
        ProductStatus status,

        @NotNull(message = "Minimum loan amount is required")
        @DecimalMin(value = "1000.00", message = "Minimum loan amount must be at least 1000")
        BigDecimal minimumLoanAmount,

        @NotNull(message = "Maximum loan amount is required")
        @DecimalMin(value = "1000.00", message = "Maximum loan amount must be at least 1000")
        BigDecimal maximumLoanAmount,

        @NotNull(message = "Minimum interest rate is required")
        @DecimalMin(value = "0.01", message = "Minimum interest rate must be positive")
        @DecimalMax(value = "50.00", message = "Minimum interest rate cannot exceed 50%")
        BigDecimal minimumInterestRate,

        @NotNull(message = "Maximum interest rate is required")
        @DecimalMin(value = "0.01", message = "Maximum interest rate must be positive")
        @DecimalMax(value = "50.00", message = "Maximum interest rate cannot exceed 50%")
        BigDecimal maximumInterestRate,

        @NotNull(message = "Interest calculation method is required")
        InterestCalculationMethod interestCalculationMethod,

        @NotNull(message = "Minimum tenure months is required")
        @Min(value = 1, message = "Minimum tenure must be at least 1 month")
        Integer minimumTenureMonths,

        @NotNull(message = "Maximum tenure months is required")
        @Max(value = 480, message = "Maximum tenure cannot exceed 480 months")
        Integer maximumTenureMonths,

        @DecimalMin(value = "0.00")
        @DecimalMax(value = "100.00")
        BigDecimal maximumLTVPercentage,

        @DecimalMin(value = "0.00")
        BigDecimal minimumMonthlyIncome,

        @DecimalMin(value = "10.00")
        @DecimalMax(value = "90.00")
        BigDecimal maxFoirPercentage,

        @Size(min = 3, max = 3)
        String currency,

        Boolean secured,
        Boolean balanceTransferAllowed,
        Boolean topUpAllowed,
        Boolean stepUpEMIAllowed,
        @Min(0) Integer stepUpEMIDurationMonths,

        List<String> requiredDocuments,
        Map<String, Object> eligibilityRules,
        List<String> applicableOffers,

        @Valid
        @NotNull(message = "Fees and charges configuration is required")
        LoanProductFeeRequest feesAndCharges
) {
}
