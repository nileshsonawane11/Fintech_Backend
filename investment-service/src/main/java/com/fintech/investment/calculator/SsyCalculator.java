package com.fintech.investment.calculator;

import com.fintech.investment.calculator.CalculationDtos.SsyCalculationResult;
import com.fintech.investment.exception.ApiException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Pure BigDecimal Sukanya Samriddhi Yojana (SSY) demonstration calculator.
 * Models annual compounding across a 15-year deposit period and 21-year maturity period
 * using configurable effective-dated Government-notified interest rates.
 */
@Component
public class SsyCalculator {

    private static final MathContext MC = MathContext.DECIMAL128;
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal FIFTY_PCT = new BigDecimal("0.50");

    public static final String SSY_DISCLAIMER =
            "Demonstration calculation based on configurable effective-dated Government-notified SSY rate. Subject to Ministry of Finance quarterly rate notifications and official agency onboarding.";

    public SsyCalculationResult calculate(
            BigDecimal annualDeposit,
            BigDecimal annualRatePct,
            int depositYears,
            int maturityYears,
            LocalDate startDate
    ) {
        if (annualDeposit == null || annualDeposit.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_ANNUAL_DEPOSIT", "SSY annual deposit must be positive.");
        }
        if (annualRatePct == null || annualRatePct.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_RATE", "SSY interest rate must be positive.");
        }
        if (depositYears <= 0 || maturityYears < depositYears) {
            throw ApiException.badRequest("INVALID_SSY_PERIOD", "SSY maturity period must be >= deposit period.");
        }

        LocalDate effectiveStart = startDate != null ? startDate : LocalDate.now();
        LocalDate depositEndDate = effectiveStart.plusYears(depositYears);
        LocalDate maturityDate = effectiveStart.plusYears(maturityYears);

        BigDecimal r = annualRatePct.divide(HUNDRED, MC);
        BigDecimal balance = BigDecimal.ZERO;
        BigDecimal totalInvested = BigDecimal.ZERO;

        for (int year = 1; year <= maturityYears; year++) {
            if (year <= depositYears) {
                balance = balance.add(annualDeposit, MC);
                totalInvested = totalInvested.add(annualDeposit, MC);
            }
            balance = balance.multiply(BigDecimal.ONE.add(r, MC), MC);
        }

        BigDecimal totalInvestedScaled = totalInvested.setScale(2, RoundingMode.HALF_UP);
        BigDecimal maturityValue = balance.setScale(2, RoundingMode.HALF_UP);
        BigDecimal interestEarned = maturityValue.subtract(totalInvestedScaled).max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);
        // Up to 50% of balance at end of preceding FY eligible for higher education after age 18 / 10th pass
        BigDecimal maxEduWithdrawal = maturityValue.multiply(FIFTY_PCT, MC).setScale(2, RoundingMode.HALF_UP);

        return new SsyCalculationResult(
                annualDeposit.setScale(2, RoundingMode.HALF_UP),
                depositYears,
                maturityYears,
                annualRatePct.setScale(4, RoundingMode.HALF_UP),
                effectiveStart,
                depositEndDate,
                maturityDate,
                totalInvestedScaled,
                interestEarned,
                maturityValue,
                maxEduWithdrawal,
                true,
                SSY_DISCLAIMER
        );
    }

    public BigDecimal calculateMaxEducationWithdrawal(BigDecimal precedingFyClosingBalance) {
        if (precedingFyClosingBalance == null || precedingFyClosingBalance.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return precedingFyClosingBalance.multiply(FIFTY_PCT, MC).setScale(2, RoundingMode.HALF_UP);
    }
}
