package com.fintech.loan.dto.request;

import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProductStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record UpdateLoanProductRequest(
        @Size(max = 200) String productName,
        @Size(max = 500) String shortDescription,
        String detailedDescription,
        LoanCategory loanCategory,
        List<String> eligibleLoanPurposes,
        List<String> employmentTypes,
        ProductStatus status,
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
        @Size(min = 3, max = 3) String currency,
        Boolean secured,
        Boolean balanceTransferAllowed,
        Boolean topUpAllowed,
        Boolean stepUpEMIAllowed,
        @Min(0) Integer stepUpEMIDurationMonths,
        List<String> requiredDocuments,
        Map<String, Object> eligibilityRules,
        List<String> applicableOffers,
        @Valid LoanProductFeeRequest feesAndCharges
) {
}
