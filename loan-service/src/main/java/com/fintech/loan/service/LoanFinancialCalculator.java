package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.entity.LoanProductFee;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.ProcessingFeeType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Pure BigDecimal financial math utility for EMI, FOIR, LTV, and processing fee calculations.
 */
@Component
public class LoanFinancialCalculator {

    private static final MathContext MC = new MathContext(16, RoundingMode.HALF_UP);

    /**
     * Calculate monthly EMI using reducing-balance or flat rate method.
     * Reducing balance: P * r * (1+r)^n / ((1+r)^n - 1), where r = annualRate / 1200.
     */
    public BigDecimal calculateEmi(BigDecimal principal, BigDecimal annualRatePercent,
                                   int tenureMonths, InterestCalculationMethod method) {
        if (principal == null || principal.compareTo(BigDecimal.ZERO) <= 0 || tenureMonths <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        if (annualRatePercent == null || annualRatePercent.compareTo(BigDecimal.ZERO) <= 0) {
            return principal.divide(BigDecimal.valueOf(tenureMonths), 2, RoundingMode.HALF_UP);
        }

        if (method == InterestCalculationMethod.FLAT) {
            BigDecimal years = BigDecimal.valueOf(tenureMonths).divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
            BigDecimal totalInterest = principal
                    .multiply(annualRatePercent)
                    .divide(LoanConstants.HUNDRED, 10, RoundingMode.HALF_UP)
                    .multiply(years);
            return principal.add(totalInterest)
                    .divide(BigDecimal.valueOf(tenureMonths), 2, RoundingMode.HALF_UP);
        }

        // Default: REDUCING_BALANCE
        BigDecimal monthlyRate = annualRatePercent.divide(LoanConstants.TWELVE_HUNDRED, 12, RoundingMode.HALF_UP);
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal onePlusRPowN = onePlusR.pow(tenureMonths, MC);
        BigDecimal numerator = principal.multiply(monthlyRate, MC).multiply(onePlusRPowN, MC);
        BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE, MC);

        if (denominator.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(tenureMonths), 2, RoundingMode.HALF_UP);
        }
        return numerator.divide(denominator, 2, RoundingMode.HALF_UP);
    }

    /**
     * Calculate FOIR (Fixed Obligation to Income Ratio) as a percentage:
     * ((existingMonthlyEmis + proposedEmi) / monthlyIncome) * 100.
     */
    public BigDecimal calculateFoirPercentage(BigDecimal monthlyIncome, BigDecimal existingMonthlyEmis, BigDecimal proposedEmi) {
        if (monthlyIncome == null || monthlyIncome.compareTo(BigDecimal.ZERO) <= 0) {
            return LoanConstants.HUNDRED.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal existing = existingMonthlyEmis != null ? existingMonthlyEmis : BigDecimal.ZERO;
        BigDecimal proposed = proposedEmi != null ? proposedEmi : BigDecimal.ZERO;
        return existing.add(proposed)
                .multiply(LoanConstants.HUNDRED)
                .divide(monthlyIncome, 2, RoundingMode.HALF_UP);
    }

    /**
     * Calculate LTV (Loan-to-Value) as a percentage: (loanAmount / collateralValue) * 100.
     */
    public BigDecimal calculateLtvPercentage(BigDecimal loanAmount, BigDecimal collateralValue) {
        if (loanAmount == null || collateralValue == null || collateralValue.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return loanAmount.multiply(LoanConstants.HUNDRED)
                .divide(collateralValue, 2, RoundingMode.HALF_UP);
    }

    /**
     * Calculate processing fee respecting fee type and min/max bounds.
     */
    public BigDecimal calculateProcessingFee(BigDecimal loanAmount, LoanProductFee fee) {
        if (loanAmount == null || fee == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal rawFee;
        if (fee.getProcessingFeeType() == ProcessingFeeType.FIXED) {
            rawFee = fee.getProcessingFeeValue() != null ? fee.getProcessingFeeValue() : BigDecimal.ZERO;
        } else {
            BigDecimal pct = fee.getProcessingFeeValue() != null ? fee.getProcessingFeeValue() : BigDecimal.ZERO;
            rawFee = loanAmount.multiply(pct).divide(LoanConstants.HUNDRED, 2, RoundingMode.HALF_UP);
            if (fee.getProcessingFeeType() == ProcessingFeeType.HYBRID && fee.getMinimumProcessingFee() != null) {
                rawFee = rawFee.add(fee.getMinimumProcessingFee());
            }
        }

        if (fee.getMinimumProcessingFee() != null && rawFee.compareTo(fee.getMinimumProcessingFee()) < 0) {
            rawFee = fee.getMinimumProcessingFee();
        }
        if (fee.getMaximumProcessingFee() != null && fee.getMaximumProcessingFee().compareTo(BigDecimal.ZERO) > 0
                && rawFee.compareTo(fee.getMaximumProcessingFee()) > 0) {
            rawFee = fee.getMaximumProcessingFee();
        }
        return rawFee.setScale(2, RoundingMode.HALF_UP);
    }
}
