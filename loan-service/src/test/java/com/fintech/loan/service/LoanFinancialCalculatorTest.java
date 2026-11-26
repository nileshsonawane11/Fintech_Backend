package com.fintech.loan.service;

import com.fintech.loan.entity.LoanProductFee;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.ProcessingFeeType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class LoanFinancialCalculatorTest {

    private final LoanFinancialCalculator calculator = new LoanFinancialCalculator();

    @Test
    void calculatesReducingBalanceEmiAccurately() {
        // 10,00,000 @ 8.35% for 240 months => 8583.53
        BigDecimal emi = calculator.calculateEmi(
                new BigDecimal("1000000.00"),
                new BigDecimal("8.35"),
                240,
                InterestCalculationMethod.REDUCING_BALANCE
        );
        assertEquals(new BigDecimal("8583.53"), emi);
    }

    @Test
    void calculatesFlatRateEmiAccurately() {
        // 1,20,000 @ 10% flat for 12 months => (120000 + 12000) / 12 = 11000.00
        BigDecimal emi = calculator.calculateEmi(
                new BigDecimal("120000.00"),
                new BigDecimal("10.00"),
                12,
                InterestCalculationMethod.FLAT
        );
        assertEquals(new BigDecimal("11000.00"), emi);
    }

    @Test
    void calculatesFoirPercentageProperly() {
        // Income 100,000, existing EMIs 15,000, proposed EMI 35,000 => 50.00%
        BigDecimal foir = calculator.calculateFoirPercentage(
                new BigDecimal("100000.00"),
                new BigDecimal("15000.00"),
                new BigDecimal("35000.00")
        );
        assertEquals(new BigDecimal("50.00"), foir);
    }

    @Test
    void calculatesProcessingFeeWithHomeLoanMinAndMaxCaps() {
        LoanProductFee homeFee = new LoanProductFee();
        homeFee.setProcessingFeeType(ProcessingFeeType.PERCENTAGE);
        homeFee.setProcessingFeeValue(new BigDecimal("0.40"));
        homeFee.setMinimumProcessingFee(new BigDecimal("5000.00"));
        homeFee.setMaximumProcessingFee(new BigDecimal("25000.00"));

        // 0.40% of 5,00,000 = 2,000 -> clamped to min 5,000
        assertEquals(new BigDecimal("5000.00"),
                calculator.calculateProcessingFee(new BigDecimal("500000.00"), homeFee));

        // 0.40% of 25,00,000 = 10,000 -> within bounds
        assertEquals(new BigDecimal("10000.00"),
                calculator.calculateProcessingFee(new BigDecimal("2500000.00"), homeFee));

        // 0.40% of 1,00,00,000 = 40,000 -> clamped to max 25,000
        assertEquals(new BigDecimal("25000.00"),
                calculator.calculateProcessingFee(new BigDecimal("10000000.00"), homeFee));
    }

    @Test
    void calculatesLtvPercentage() {
        BigDecimal ltv = calculator.calculateLtvPercentage(
                new BigDecimal("8500000.00"),
                new BigDecimal("10000000.00")
        );
        assertEquals(new BigDecimal("85.00"), ltv);
    }
}
