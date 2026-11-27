package com.fintech.investment.calculator;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class CalculationDtos {

    private CalculationDtos() {}

    public enum CompoundingFrequency {
        MONTHLY(12),
        QUARTERLY(4),
        HALF_YEARLY(2),
        ANNUAL(1);

        private final int periodsPerYear;

        CompoundingFrequency(int periodsPerYear) {
            this.periodsPerYear = periodsPerYear;
        }

        public int periodsPerYear() {
            return periodsPerYear;
        }
    }

    public enum PayoutFrequency {
        MATURITY,
        MONTHLY,
        QUARTERLY,
        ANNUAL
    }

    public record FdCalculationResult(
            BigDecimal principal,
            BigDecimal annualRatePct,
            int tenureDays,
            LocalDate startDate,
            LocalDate maturityDate,
            CompoundingFrequency compoundingFrequency,
            PayoutFrequency payoutFrequency,
            BigDecimal interestEarned,
            BigDecimal periodicPayoutAmount,
            BigDecimal maturityValue,
            BigDecimal maxLoanAgainstFdAmount,
            boolean returnsGuaranteed,
            String disclosure
    ) {}

    public record FdPrematureResult(
            BigDecimal principal,
            BigDecimal contractedRatePct,
            BigDecimal penaltyRatePct,
            BigDecimal effectiveRatePct,
            long elapsedDays,
            BigDecimal interestEarned,
            BigDecimal penaltyAmount,
            BigDecimal netPayoutAmount
    ) {}

    public record RdCalculationResult(
            BigDecimal monthlyInstallment,
            int tenureMonths,
            BigDecimal annualRatePct,
            LocalDate startDate,
            LocalDate maturityDate,
            BigDecimal totalInvested,
            BigDecimal interestEarned,
            BigDecimal maturityValue,
            boolean returnsGuaranteed,
            String disclosure
    ) {}

    public record SipCalculationResult(
            BigDecimal monthlyInvestment,
            int tenureMonths,
            BigDecimal assumedAnnualReturnPct,
            BigDecimal totalInvested,
            BigDecimal projectedGain,
            BigDecimal projectedValue,
            boolean isIllustrative,
            boolean returnsGuaranteed,
            String disclosure
    ) {}

    public record SsyCalculationResult(
            BigDecimal annualDeposit,
            int depositYears,
            int maturityYears,
            BigDecimal annualRatePct,
            LocalDate startDate,
            LocalDate depositEndDate,
            LocalDate maturityDate,
            BigDecimal totalInvested,
            BigDecimal interestEarned,
            BigDecimal maturityValue,
            BigDecimal maxEligibleEducationWithdrawal,
            boolean isDemonstrationCalculation,
            String disclosure
    ) {}
}
