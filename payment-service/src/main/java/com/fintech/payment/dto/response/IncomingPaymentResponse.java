package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record IncomingPaymentResponse(
        String incomingPaymentId,
        String receiverId,
        String finbankAccountId,
        String channel,
        BigDecimal amount,
        BigDecimal feeAmount,
        BigDecimal netCreditAmount,
        String currency,
        String status,
        String payerName,
        String payerVpaMasked,
        String payerBank,
        String utr,
        String ledgerTransactionId,
        String refundId,
        BigDecimal refundAmount,
        Instant receivedAt,
        Instant creditedAt
) {}
