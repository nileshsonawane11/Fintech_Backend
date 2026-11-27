package com.fintech.payment.dto.response;

import com.fintech.payment.enums.PaymentPurpose;
import com.fintech.payment.enums.PaymentTransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentOrderResponse(
        String paymentId,
        String razorpayOrderId,
        String keyId,
        BigDecimal amount,
        long amountPaise,
        String currency,
        PaymentPurpose purpose,
        String destinationAccountId,
        String businessReference,
        PaymentTransactionStatus status,
        String receipt,
        Instant createdAt
) {}
