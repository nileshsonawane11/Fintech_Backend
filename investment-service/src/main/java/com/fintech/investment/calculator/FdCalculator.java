package com.fintech.investment.calculator;

import com.fintech.investment.calculator.CalculationDtos.*;
import com.fintech.investment.exception.ApiException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Pure BigDecimal Fixed Deposit financial calculator.
 * Uses DECIMAL128 for intermediate precision and HALF_UP scale 2 for INR amounts.
 */
@Component
public class FdCalculator {

    private static final MathContext MC = MathContext.DECIMAL128;
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal DAYS_IN_YEAR = new BigDecimal("365");
    private static final BigDecimal DAYS_IN_LEAP_YEAR = new BigDecimal("366");

    public FdCalculationResult calculate(
            BigDecimal principal,
            BigDecimal annualRatePct,
            LocalDate startDate,
            int tenureMonths,
            Integer explicitTenureDays,
            CompoundingFrequency compoundingFrequency,
            PayoutFrequency payoutFrequency,
            BigDecimal maxLtvPct
    ) {
        if (principal == null || principal.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_PRINCIPAL", "FD principal must be greater than zero.");
        }
        if (annualRatePct == null || annualRatePct.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_RATE", "FD interest rate must be greater than zero.");
        }
        LocalDate effectiveStart = startDate != null ? startDate : LocalDate.now();
        LocalDate maturityDate = (explicitTenureDays != null && explicitTenureDays > 0)
                ? effectiveStart.plusDays(explicitTenureDays)
                : effectiveStart.plusMonths(tenureMonths);
        int actualDays = (int) ChronoUnit.DAYS.between(effectiveStart, maturityDate);
        if (actualDays <= 0) {
            throw ApiException.badRequest("INVALID_TENURE", "FD tenure must be at least 1 day.");
        }

        BigDecimal dayCountBase = effectiveStart.isLeapYear() || maturityDate.isLeapYear()
                ? computeBlendedYearDays(effectiveStart, maturityDate, actualDays)
                : DAYS_IN_YEAR;

        BigDecimal years = BigDecimal.valueOf(actualDays).divide(dayCountBase, MC);
        BigDecimal rateDecimal = annualRatePct.divide(HUNDRED, MC);

        BigDecimal maturityValue;
        BigDecimal interestEarned;
        BigDecimal periodicPayout = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (payoutFrequency == PayoutFrequency.MATURITY) {
            int n = compoundingFrequency.periodsPerYear();
            // A = P * (1 + r/n)^(n*t) using BigDecimal exp/ln approximation via integer + fractional power
            BigDecimal periodRate = rateDecimal.divide(BigDecimal.valueOf(n), MC);
            BigDecimal totalPeriods = BigDecimal.valueOf(n).multiply(years, MC);
            BigDecimal growthFactor = pow(BigDecimal.ONE.add(periodRate, MC), totalPeriods);
            maturityValue = principal.multiply(growthFactor, MC).setScale(2, RoundingMode.HALF_UP);
            interestEarned = maturityValue.subtract(principal).setScale(2, RoundingMode.HALF_UP);
        } else {
            // Periodic non-cumulative payout: simple interest per payout cycle, principal returned at maturity
            BigDecimal totalSimpleInterest = principal.multiply(rateDecimal, MC)
                    .multiply(years, MC)
                    .setScale(2, RoundingMode.HALF_UP);
            interestEarned = totalSimpleInterest;
            maturityValue = principal.setScale(2, RoundingMode.HALF_UP);

            int payoutsPerYear = switch (payoutFrequency) {
                case MONTHLY -> 12;
                case QUARTERLY -> 4;
                case ANNUAL -> 1;
                case MATURITY -> 1;
            };
            BigDecimal totalPayouts = years.multiply(BigDecimal.valueOf(payoutsPerYear), MC);
            if (totalPayouts.compareTo(BigDecimal.ONE) >= 0) {
                periodicPayout = totalSimpleInterest.divide(totalPayouts, 2, RoundingMode.HALF_UP);
            } else {
                periodicPayout = totalSimpleInterest;
            }
        }

        BigDecimal ltv = maxLtvPct != null ? maxLtvPct : new BigDecimal("90.00");
        BigDecimal maxLoanAmount = principal.multiply(ltv, MC)
                .divide(HUNDRED, 2, RoundingMode.HALF_UP);

        return new FdCalculationResult(
                principal.setScale(2, RoundingMode.HALF_UP),
                annualRatePct.setScale(4, RoundingMode.HALF_UP),
                actualDays,
                effectiveStart,
                maturityDate,
                compoundingFrequency,
                payoutFrequency,
                interestEarned,
                periodicPayout,
                maturityValue,
                maxLoanAmount,
                true,
                "Guaranteed contractual Fixed Deposit return at locked booking rate."
        );
    }

    public FdPrematureResult calculatePrematureWithdrawal(
            BigDecimal principal,
            BigDecimal contractedRatePct,
            BigDecimal applicableRateForElapsedPeriodPct,
            BigDecimal penaltyRatePct,
            LocalDate startDate,
            LocalDate withdrawalDate,
            CompoundingFrequency compoundingFrequency
    ) {
        if (withdrawalDate.isBefore(startDate)) {
            throw ApiException.badRequest("INVALID_WITHDRAWAL_DATE", "Withdrawal date cannot be before start date.");
        }
        long elapsedDays = ChronoUnit.DAYS.between(startDate, withdrawalDate);
        if (elapsedDays < 7) {
            // Standard banking rule: no interest for < 7 days premature closure
            return new FdPrematureResult(
                    principal.setScale(2, RoundingMode.HALF_UP),
                    contractedRatePct.setScale(4, RoundingMode.HALF_UP),
                    penaltyRatePct.setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP),
                    elapsedDays,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    principal.setScale(2, RoundingMode.HALF_UP)
            );
        }

        BigDecimal baseRate = applicableRateForElapsedPeriodPct != null
                ? applicableRateForElapsedPeriodPct.min(contractedRatePct)
                : contractedRatePct;
        BigDecimal penalty = penaltyRatePct != null ? penaltyRatePct : BigDecimal.ONE;
        BigDecimal effectiveRate = baseRate.subtract(penalty).max(BigDecimal.ZERO);

        BigDecimal years = BigDecimal.valueOf(elapsedDays)
                .divide(computeBlendedYearDays(startDate, withdrawalDate, (int) elapsedDays), MC);

        BigDecimal grossInterestAtBase = computeCompoundInterest(principal, baseRate, years, compoundingFrequency);
        BigDecimal netInterest = computeCompoundInterest(principal, effectiveRate, years, compoundingFrequency);
        BigDecimal penaltyAmount = grossInterestAtBase.subtract(netInterest).max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        return new FdPrematureResult(
                principal.setScale(2, RoundingMode.HALF_UP),
                contractedRatePct.setScale(4, RoundingMode.HALF_UP),
                penalty.setScale(2, RoundingMode.HALF_UP),
                effectiveRate.setScale(4, RoundingMode.HALF_UP),
                elapsedDays,
                netInterest,
                penaltyAmount,
                principal.add(netInterest).setScale(2, RoundingMode.HALF_UP)
        );
    }

    private BigDecimal computeCompoundInterest(BigDecimal principal, BigDecimal ratePct,
                                               BigDecimal years, CompoundingFrequency freq) {
        if (ratePct.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        int n = freq.periodsPerYear();
        BigDecimal r = ratePct.divide(HUNDRED, MC);
        BigDecimal periodRate = r.divide(BigDecimal.valueOf(n), MC);
        BigDecimal totalPeriods = BigDecimal.valueOf(n).multiply(years, MC);
        BigDecimal maturity = principal.multiply(pow(BigDecimal.ONE.add(periodRate, MC), totalPeriods), MC);
        return maturity.subtract(principal).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal computeBlendedYearDays(LocalDate start, LocalDate end, int totalDays) {
        if (totalDays <= 0) {
            return DAYS_IN_YEAR;
        }
        int leapDays = 0;
        for (int year = start.getYear(); year <= end.getYear(); year++) {
            LocalDate yrStart = LocalDate.of(year, 1, 1);
            LocalDate yrEnd = LocalDate.of(year, 12, 31);
            LocalDate overlapStart = start.isAfter(yrStart) ? start : yrStart;
            LocalDate overlapEnd = end.isBefore(yrEnd) ? end : yrEnd;
            if (!overlapEnd.isBefore(overlapStart) && java.time.Year.isLeap(year)) {
                leapDays += (int) ChronoUnit.DAYS.between(overlapStart, overlapEnd) + 1;
            }
        }
        BigDecimal leapRatio = BigDecimal.valueOf(leapDays).divide(BigDecimal.valueOf(totalDays), MC);
        return DAYS_IN_YEAR.add(leapRatio.multiply(DAYS_IN_LEAP_YEAR.subtract(DAYS_IN_YEAR), MC), MC);
    }

    /**
     * Exact BigDecimal power base^exp = exp(exp * ln(base)) using Taylor/Newton series with DECIMAL128 precision.
     */
    static BigDecimal pow(BigDecimal base, BigDecimal exponent) {
        if (exponent.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ONE;
        }
        BigDecimal integerPart = exponent.setScale(0, RoundingMode.DOWN);
        BigDecimal fractionalPart = exponent.subtract(integerPart);
        BigDecimal intPow = base.pow(integerPart.intValueExact(), MC);
        if (fractionalPart.compareTo(BigDecimal.ZERO) == 0) {
            return intPow;
        }
        BigDecimal lnBase = ln(base);
        BigDecimal fracPow = exp(fractionalPart.multiply(lnBase, MC));
        return intPow.multiply(fracPow, MC);
    }

    private static BigDecimal ln(BigDecimal x) {
        // ln(x) via atanh series: ln(x) = 2 * sum_{k=0..} (1/(2k+1)) * ((x-1)/(x+1))^(2k+1)
        BigDecimal num = x.subtract(BigDecimal.ONE, MC);
        BigDecimal den = x.add(BigDecimal.ONE, MC);
        BigDecimal y = num.divide(den, MC);
        BigDecimal y2 = y.multiply(y, MC);
        BigDecimal term = y;
        BigDecimal sum = y;
        BigDecimal threshold = new BigDecimal("1E-32");
        for (int k = 1; k < 100; k++) {
            term = term.multiply(y2, MC);
            BigDecimal next = term.divide(BigDecimal.valueOf(2L * k + 1), MC);
            sum = sum.add(next, MC);
            if (next.abs().compareTo(threshold) < 0) {
                break;
            }
        }
        return sum.multiply(BigDecimal.valueOf(2), MC);
    }

    private static BigDecimal exp(BigDecimal x) {
        BigDecimal sum = BigDecimal.ONE;
        BigDecimal term = BigDecimal.ONE;
        BigDecimal threshold = new BigDecimal("1E-32");
        for (int k = 1; k < 100; k++) {
            term = term.multiply(x, MC).divide(BigDecimal.valueOf(k), MC);
            sum = sum.add(term, MC);
            if (term.abs().compareTo(threshold) < 0) {
                break;
            }
        }
        return sum;
    }
}
