package com.fintech.investment.calculator;

import com.fintech.investment.calculator.CalculationDtos.RdCalculationResult;
import com.fintech.investment.exception.ApiException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Pure BigDecimal Recurring Deposit calculator using Indian banking quarterly compounding convention.
 * Each monthly instalment compounds quarterly for its remaining quarters:
 * M = sum_{i=1..N} P * (1 + r/4)^(4 * (N - i + 1) / 12)
 */
@Component
public class RdCalculator {

    private static final MathContext MC = MathContext.DECIMAL128;
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal FOUR = new BigDecimal("4");
    private static final BigDecimal TWELVE = new BigDecimal("12");

    public RdCalculationResult calculate(
            BigDecimal monthlyInstallment,
            int tenureMonths,
            BigDecimal annualRatePct,
            LocalDate startDate
    ) {
        if (monthlyInstallment == null || monthlyInstallment.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_MONTHLY_AMOUNT", "RD monthly instalment must be positive.");
        }
        if (tenureMonths <= 0) {
            throw ApiException.badRequest("INVALID_TENURE", "RD tenure must be at least 1 month.");
        }
        if (annualRatePct == null || annualRatePct.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_RATE", "RD interest rate must be positive.");
        }

        LocalDate effectiveStart = startDate != null ? startDate : LocalDate.now();
        LocalDate maturityDate = effectiveStart.plusMonths(tenureMonths);

        BigDecimal r = annualRatePct.divide(HUNDRED, MC);
        BigDecimal quarterlyBase = BigDecimal.ONE.add(r.divide(FOUR, MC), MC);

        BigDecimal maturityAccumulator = BigDecimal.ZERO;
        for (int i = 1; i <= tenureMonths; i++) {
            int remainingMonths = tenureMonths - i + 1;
            BigDecimal quarters = BigDecimal.valueOf(remainingMonths).multiply(FOUR, MC).divide(TWELVE, MC);
            BigDecimal factor = FdCalculator.pow(quarterlyBase, quarters);
            maturityAccumulator = maturityAccumulator.add(monthlyInstallment.multiply(factor, MC), MC);
        }

        BigDecimal totalInvested = monthlyInstallment.multiply(BigDecimal.valueOf(tenureMonths), MC)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal maturityValue = maturityAccumulator.setScale(2, RoundingMode.HALF_UP);
        BigDecimal interestEarned = maturityValue.subtract(totalInvested).max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        return new RdCalculationResult(
                monthlyInstallment.setScale(2, RoundingMode.HALF_UP),
                tenureMonths,
                annualRatePct.setScale(4, RoundingMode.HALF_UP),
                effectiveStart,
                maturityDate,
                totalInvested,
                interestEarned,
                maturityValue,
                true,
                "Guaranteed contractual Recurring Deposit return with quarterly compounding."
        );
    }

    public BigDecimal calculatePrematureClosurePayout(
            BigDecimal totalPrincipalPaid,
            int completedMonths,
            BigDecimal contractedRatePct,
            BigDecimal penaltyRatePct
    ) {
        if (completedMonths <= 0 || totalPrincipalPaid.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal effectiveRate = contractedRatePct.subtract(penaltyRatePct != null ? penaltyRatePct : BigDecimal.ONE)
                .max(BigDecimal.ZERO);
        if (effectiveRate.compareTo(BigDecimal.ZERO) == 0) {
            return totalPrincipalPaid.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal avgMonthly = totalPrincipalPaid.divide(BigDecimal.valueOf(completedMonths), MC);
        return calculate(avgMonthly, completedMonths, effectiveRate, LocalDate.now()).maturityValue();
    }
}
