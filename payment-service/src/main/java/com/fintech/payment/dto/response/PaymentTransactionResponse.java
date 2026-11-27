package com.fintech.payment.dto.response;

import com.fintech.payment.enums.PaymentPurpose;
import com.fintech.payment.enums.PaymentTransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentTransactionResponse(
        String paymentId,
        String identitySubject,
        String customerId,
        String destinationAccountId,
        PaymentPurpose purpose,
        String businessReference,
        BigDecimal amount,
        BigDecimal refundedAmount,
        String currency,
        PaymentTransactionStatus status,
        String razorpayOrderId,
        String razorpayPaymentId,
        boolean razorpaySignatureVerified,
        String paymentMethod,
        String ledgerTransactionId,
        String ledgerReversalTxId,
        String failureCode,
        String failureReason,
        Instant capturedAt,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {}
