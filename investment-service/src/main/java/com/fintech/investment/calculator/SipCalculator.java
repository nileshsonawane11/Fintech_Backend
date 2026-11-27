package com.fintech.investment.calculator;

import com.fintech.investment.calculator.CalculationDtos.SipCalculationResult;
import com.fintech.investment.exception.ApiException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Illustrative SIP Calculator using BigDecimal.
 * IMPORTANT: SIP returns are market-linked and NEVER guaranteed.
 */
@Component
public class SipCalculator {

    private static final MathContext MC = MathContext.DECIMAL128;
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal TWELVE = new BigDecimal("12");

    public static final String SIP_DISCLAIMER =
            "Illustrative projection only. Mutual fund SIP investments are subject to market risks; returns are NOT guaranteed.";

    public SipCalculationResult calculateIllustrative(
            BigDecimal monthlyInvestment,
            int tenureMonths,
            BigDecimal assumedAnnualReturnPct
    ) {
        if (monthlyInvestment == null || monthlyInvestment.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_MONTHLY_AMOUNT", "SIP monthly investment must be positive.");
        }
        if (tenureMonths <= 0) {
            throw ApiException.badRequest("INVALID_TENURE", "SIP horizon must be at least 1 month.");
        }
        if (assumedAnnualReturnPct == null || assumedAnnualReturnPct.compareTo(BigDecimal.ZERO) < 0) {
            throw ApiException.badRequest("INVALID_ASSUMED_RETURN", "Assumed annual return cannot be negative.");
        }

        BigDecimal totalInvested = monthlyInvestment.multiply(BigDecimal.valueOf(tenureMonths), MC)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal projectedValue;
        if (assumedAnnualReturnPct.compareTo(BigDecimal.ZERO) == 0) {
            projectedValue = totalInvested;
        } else {
            // FV = P * [((1 + i)^n - 1) / i] * (1 + i) where i = r / 12
            BigDecimal i = assumedAnnualReturnPct.divide(HUNDRED, MC).divide(TWELVE, MC);
            BigDecimal onePlusI = BigDecimal.ONE.add(i, MC);
            BigDecimal power = onePlusI.pow(tenureMonths, MC);
            projectedValue = monthlyInvestment
                    .multiply(power.subtract(BigDecimal.ONE, MC), MC)
                    .divide(i, MC)
                    .multiply(onePlusI, MC)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal projectedGain = projectedValue.subtract(totalInvested).max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        return new SipCalculationResult(
                monthlyInvestment.setScale(2, RoundingMode.HALF_UP),
                tenureMonths,
                assumedAnnualReturnPct.setScale(4, RoundingMode.HALF_UP),
                totalInvested,
                projectedGain,
                projectedValue,
                true,
                false,
                SIP_DISCLAIMER
        );
    }
}
