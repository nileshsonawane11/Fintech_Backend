package com.fintech.investment.calculator;

import com.fintech.investment.calculator.CalculationDtos.*;
import com.fintech.investment.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InvestmentCalculatorsTest {

    private final FdCalculator fdCalculator = new FdCalculator();
    private final RdCalculator rdCalculator = new RdCalculator();
    private final SipCalculator sipCalculator = new SipCalculator();
    private final SsyCalculator ssyCalculator = new SsyCalculator();

    @Test
    void fdCumulativeAndPeriodicCalculationsShouldBeAccurate() {
        FdCalculationResult cumulative = fdCalculator.calculate(
                new BigDecimal("100000"),
                new BigDecimal("7.50"),
                LocalDate.of(2025, 1, 1),
                12,
                null,
                CompoundingFrequency.QUARTERLY,
                PayoutFrequency.MATURITY,
                new BigDecimal("90.00")
        );

        // 100000 * (1 + 0.075/4)^4 = 107713.59 (approx)
        assertThat(cumulative.principal()).isEqualByComparingTo("100000.00");
        assertThat(cumulative.maturityValue()).isBetween(new BigDecimal("107710.00"), new BigDecimal("107720.00"));
        assertThat(cumulative.interestEarned()).isEqualByComparingTo(cumulative.maturityValue().subtract(cumulative.principal()));
        assertThat(cumulative.maxLoanAgainstFdAmount()).isEqualByComparingTo("90000.00");
        assertThat(cumulative.returnsGuaranteed()).isTrue();

        FdCalculationResult monthly = fdCalculator.calculate(
                new BigDecimal("100000"),
                new BigDecimal("7.50"),
                LocalDate.of(2025, 1, 1),
                12,
                null,
                CompoundingFrequency.QUARTERLY,
                PayoutFrequency.MONTHLY,
                new BigDecimal("90.00")
        );
        assertThat(monthly.maturityValue()).isEqualByComparingTo("100000.00");
        assertThat(monthly.interestEarned()).isEqualByComparingTo("7500.00");
        assertThat(monthly.periodicPayoutAmount()).isEqualByComparingTo("625.00");
    }

    @Test
    void fdLeapYearAndPrematureWithdrawalRules() {
        FdCalculationResult leapFd = fdCalculator.calculate(
                new BigDecimal("50000"),
                new BigDecimal("7.00"),
                LocalDate.of(2024, 1, 1),
                12,
                null,
                CompoundingFrequency.QUARTERLY,
                PayoutFrequency.MATURITY,
                new BigDecimal("90.00")
        );
        assertThat(leapFd.tenureDays()).isEqualTo(366);
        assertThat(leapFd.maturityDate()).isEqualTo(LocalDate.of(2025, 1, 1));

        // < 7 days premature withdrawal earns 0 interest and 0 penalty
        FdPrematureResult under7Days = fdCalculator.calculatePrematureWithdrawal(
                new BigDecimal("50000"),
                new BigDecimal("7.50"),
                new BigDecimal("6.75"),
                new BigDecimal("1.00"),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 5),
                CompoundingFrequency.QUARTERLY
        );
        assertThat(under7Days.interestEarned()).isEqualByComparingTo("0.00");
        assertThat(under7Days.netPayoutAmount()).isEqualByComparingTo("50000.00");

        // 200 days premature withdrawal applies penalty
        FdPrematureResult normalPremature = fdCalculator.calculatePrematureWithdrawal(
                new BigDecimal("50000"),
                new BigDecimal("7.50"),
                new BigDecimal("7.10"),
                new BigDecimal("1.00"),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 7, 20),
                CompoundingFrequency.QUARTERLY
        );
        assertThat(normalPremature.effectiveRatePct()).isEqualByComparingTo("6.1000");
        assertThat(normalPremature.penaltyAmount()).isGreaterThan(BigDecimal.ZERO);
        assertThat(normalPremature.netPayoutAmount()).isGreaterThan(new BigDecimal("50000.00"));
    }

    @Test
    void rdCalculationAndPrematureClosure() {
        RdCalculationResult rd = rdCalculator.calculate(
                new BigDecimal("5000"),
                12,
                new BigDecimal("7.00"),
                LocalDate.of(2026, 1, 1)
        );
        assertThat(rd.totalInvested()).isEqualByComparingTo("60000.00");
        assertThat(rd.interestEarned()).isBetween(new BigDecimal("2200.00"), new BigDecimal("2400.00"));
        assertThat(rd.maturityValue()).isEqualByComparingTo(rd.totalInvested().add(rd.interestEarned()));
        assertThat(rd.returnsGuaranteed()).isTrue();

        BigDecimal premature = rdCalculator.calculatePrematureClosurePayout(
                new BigDecimal("30000"), 6, new BigDecimal("7.00"), new BigDecimal("1.00"));
        assertThat(premature).isGreaterThan(new BigDecimal("30000.00"));
    }

    @Test
    void sipCalculationMustBeIllustrativeAndNonGuaranteed() {
        SipCalculationResult sip = sipCalculator.calculateIllustrative(
                new BigDecimal("10000"),
                120,
                new BigDecimal("12.00")
        );
        assertThat(sip.totalInvested()).isEqualByComparingTo("1200000.00");
        assertThat(sip.projectedValue()).isBetween(new BigDecimal("2320000.00"), new BigDecimal("2325000.00"));
        assertThat(sip.projectedGain()).isEqualByComparingTo(sip.projectedValue().subtract(sip.totalInvested()));
        assertThat(sip.isIllustrative()).isTrue();
        assertThat(sip.returnsGuaranteed()).isFalse();
        assertThat(sip.disclosure()).contains("NOT guaranteed");

        SipCalculationResult zeroReturn = sipCalculator.calculateIllustrative(
                new BigDecimal("1000"), 12, BigDecimal.ZERO
        );
        assertThat(zeroReturn.projectedValue()).isEqualByComparingTo("12000.00");
        assertThat(zeroReturn.projectedGain()).isEqualByComparingTo("0.00");
    }

    @Test
    void ssyCalculationShouldModel15YearDepositAnd21YearMaturity() {
        SsyCalculationResult ssy = ssyCalculator.calculate(
                new BigDecimal("150000"),
                new BigDecimal("8.20"),
                15,
                21,
                LocalDate.of(2026, 4, 1)
        );
        assertThat(ssy.totalInvested()).isEqualByComparingTo("2250000.00");
        assertThat(ssy.depositEndDate()).isEqualTo(LocalDate.of(2041, 4, 1));
        assertThat(ssy.maturityDate()).isEqualTo(LocalDate.of(2047, 4, 1));
        assertThat(ssy.maturityValue()).isGreaterThan(new BigDecimal("6800000.00"));
        assertThat(ssy.isDemonstrationCalculation()).isTrue();
        assertThat(ssyCalculator.calculateMaxEducationWithdrawal(new BigDecimal("1000000.00")))
                .isEqualByComparingTo("500000.00");
    }

    @Test
    void calculatorsShouldRejectInvalidInputs() {
        assertThatThrownBy(() -> fdCalculator.calculate(
                BigDecimal.ZERO, new BigDecimal("7.00"), LocalDate.now(), 12, null,
                CompoundingFrequency.QUARTERLY, PayoutFrequency.MATURITY, new BigDecimal("90")))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> sipCalculator.calculateIllustrative(
                new BigDecimal("1000"), 0, new BigDecimal("12")))
                .isInstanceOf(ApiException.class);
    }
}
