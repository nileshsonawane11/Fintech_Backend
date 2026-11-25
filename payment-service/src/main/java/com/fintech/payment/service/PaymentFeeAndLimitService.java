package com.fintech.payment.service;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.entity.PaymentFeeConfig;
import com.fintech.payment.entity.PaymentLimitConfig;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.PaymentFeeConfigRepository;
import com.fintech.payment.repository.PaymentLimitConfigRepository;
import com.fintech.payment.repository.PaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Service
public class PaymentFeeAndLimitService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    public record FeeCalculation(
            BigDecimal baseFee,
            BigDecimal taxAmount,
            BigDecimal totalFee,
            BigDecimal totalDebit
    ) {}

    private final PaymentFeeConfigRepository feeConfigRepository;
    private final PaymentLimitConfigRepository limitConfigRepository;
    private final PaymentRepository paymentRepository;

    public PaymentFeeAndLimitService(
            PaymentFeeConfigRepository feeConfigRepository,
            PaymentLimitConfigRepository limitConfigRepository,
            PaymentRepository paymentRepository) {
        this.feeConfigRepository = feeConfigRepository;
        this.limitConfigRepository = limitConfigRepository;
        this.paymentRepository = paymentRepository;
    }

    public void validateTransferLimits(String userId, String transferMode, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", "Transfer amount must be positive");
        }
        PaymentLimitConfig config = limitConfigRepository.findByTransferModeAndActiveTrue(transferMode)
                .orElseGet(() -> defaultLimitConfig(transferMode));

        if (amount.compareTo(config.getMinAmount()) < 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "AMOUNT_BELOW_LIMIT",
                    String.format("%s transfer minimum amount is %s %s",
                            transferMode, config.getMinAmount(), PaymentConstants.DEFAULT_CURRENCY));
        }
        if (amount.compareTo(config.getMaxPerTxn()) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "AMOUNT_EXCEEDS_TXN_LIMIT",
                    String.format("%s per-transaction limit is %s %s",
                            transferMode, config.getMaxPerTxn(), PaymentConstants.DEFAULT_CURRENCY));
        }

        Instant startOfUtcDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
        BigDecimal usedToday = paymentRepository.sumUserTransferAmountSince(userId, transferMode, startOfUtcDay);
        if (usedToday == null) {
            usedToday = BigDecimal.ZERO;
        }
        if (usedToday.add(amount).compareTo(config.getDailyLimit()) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DAILY_LIMIT_EXCEEDED",
                    String.format("%s daily transfer limit (%s %s) would be exceeded",
                            transferMode, config.getDailyLimit(), PaymentConstants.DEFAULT_CURRENCY));
        }
    }

    public FeeCalculation calculateFee(String transferMode, BigDecimal amount) {
        PaymentFeeConfig config = feeConfigRepository.findByTransferModeAndActiveTrue(transferMode)
                .orElse(null);
        if (config == null) {
            return new FeeCalculation(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, amount.setScale(4, RoundingMode.HALF_UP));
        }

        BigDecimal percentComponent = amount.multiply(config.getPercentFee())
                .divide(HUNDRED, 4, RoundingMode.HALF_UP);
        BigDecimal baseFee = config.getFlatFee().add(percentComponent);
        if (config.getMinFee() != null && baseFee.compareTo(config.getMinFee()) < 0) {
            baseFee = config.getMinFee();
        }
        if (config.getMaxFee() != null && config.getMaxFee().compareTo(BigDecimal.ZERO) > 0
                && baseFee.compareTo(config.getMaxFee()) > 0) {
            baseFee = config.getMaxFee();
        }
        baseFee = baseFee.setScale(2, RoundingMode.HALF_UP).setScale(4, RoundingMode.HALF_UP);

        BigDecimal tax = baseFee.multiply(config.getTaxPercent())
                .divide(HUNDRED, 2, RoundingMode.HALF_UP)
                .setScale(4, RoundingMode.HALF_UP);
        BigDecimal totalFee = baseFee.add(tax);
        BigDecimal totalDebit = amount.setScale(4, RoundingMode.HALF_UP).add(totalFee);
        return new FeeCalculation(baseFee, tax, totalFee, totalDebit);
    }

    private PaymentLimitConfig defaultLimitConfig(String mode) {
        PaymentLimitConfig c = new PaymentLimitConfig();
        c.setTransferMode(mode);
        switch (mode) {
            case "RTGS" -> {
                c.setMinAmount(new BigDecimal("200000.0000"));
                c.setMaxPerTxn(new BigDecimal("5000000.0000"));
                c.setDailyLimit(new BigDecimal("10000000.0000"));
            }
            case "UPI" -> {
                c.setMinAmount(new BigDecimal("1.0000"));
                c.setMaxPerTxn(new BigDecimal("100000.0000"));
                c.setDailyLimit(new BigDecimal("100000.0000"));
            }
            case "NEFT" -> {
                c.setMinAmount(new BigDecimal("1.0000"));
                c.setMaxPerTxn(new BigDecimal("1000000.0000"));
                c.setDailyLimit(new BigDecimal("2500000.0000"));
            }
            default -> {
                c.setMinAmount(new BigDecimal("1.0000"));
                c.setMaxPerTxn(new BigDecimal("500000.0000"));
                c.setDailyLimit(new BigDecimal("1000000.0000"));
            }
        }
        return c;
    }
}
