package com.fintech.payment.service;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.entity.PaymentLimitConfig;
import com.fintech.payment.enums.PaymentTransactionStatus;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.PaymentLimitConfigRepository;
import com.fintech.payment.repository.PaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class PaymentFeeAndLimitService {

    private static final List<PaymentTransactionStatus> ACTIVE_LIMIT_STATUSES = List.of(
            PaymentTransactionStatus.ORDER_CREATED,
            PaymentTransactionStatus.PAYMENT_PENDING,
            PaymentTransactionStatus.AUTHORIZED,
            PaymentTransactionStatus.CAPTURED,
            PaymentTransactionStatus.PROCESSING,
            PaymentTransactionStatus.COMPLETED
    );

    private final PaymentLimitConfigRepository limitConfigRepository;
    private final PaymentRepository paymentRepository;

    public PaymentFeeAndLimitService(
            PaymentLimitConfigRepository limitConfigRepository,
            PaymentRepository paymentRepository) {
        this.limitConfigRepository = limitConfigRepository;
        this.paymentRepository = paymentRepository;
    }

    public void validateOrderLimits(String identitySubject, BigDecimal amount, String currency) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", "Payment amount must be positive");
        }
        if (!PaymentConstants.DEFAULT_CURRENCY.equalsIgnoreCase(currency)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_CURRENCY",
                    "Only " + PaymentConstants.DEFAULT_CURRENCY + " is currently supported");
        }

        PaymentLimitConfig config = limitConfigRepository
                .findByTransferModeAndActiveTrue(PaymentConstants.LIMIT_MODE_RAZORPAY_ORDER)
                .orElseGet(this::defaultOrderLimitConfig);

        if (amount.compareTo(config.getMinAmount()) < 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "AMOUNT_BELOW_LIMIT",
                    String.format("Minimum payment amount is %s %s", config.getMinAmount(), PaymentConstants.DEFAULT_CURRENCY));
        }
        if (amount.compareTo(config.getMaxPerTxn()) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "AMOUNT_EXCEEDS_TXN_LIMIT",
                    String.format("Per-transaction payment limit is %s %s", config.getMaxPerTxn(), PaymentConstants.DEFAULT_CURRENCY));
        }

        Instant startOfUtcDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
        BigDecimal usedToday = paymentRepository.sumUserAmountSince(identitySubject, ACTIVE_LIMIT_STATUSES, startOfUtcDay);
        if (usedToday == null) {
            usedToday = BigDecimal.ZERO;
        }
        if (usedToday.add(amount).compareTo(config.getDailyLimit()) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "DAILY_LIMIT_EXCEEDED",
                    String.format("Daily payment limit (%s %s) would be exceeded",
                            config.getDailyLimit(), PaymentConstants.DEFAULT_CURRENCY));
        }
    }

    private PaymentLimitConfig defaultOrderLimitConfig() {
        PaymentLimitConfig config = new PaymentLimitConfig();
        config.setTransferMode(PaymentConstants.LIMIT_MODE_RAZORPAY_ORDER);
        config.setMinAmount(new BigDecimal("1.0000"));
        config.setMaxPerTxn(new BigDecimal("1000000.0000"));
        config.setDailyLimit(new BigDecimal("2500000.0000"));
        return config;
    }
}
