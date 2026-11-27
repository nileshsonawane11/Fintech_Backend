package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record RefundResponse(
        String refundId,
        String paymentId,
        String razorpayPaymentId,
        String razorpayRefundId,
        BigDecimal amount,
        String currency,
        String status,
        String reason,
        String ledgerReversalTxId,
        Instant createdAt,
        Instant updatedAt
) {}
