package com.fintech.payment.provider.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

public final class ProviderModels {

    private ProviderModels() {
    }

    public record CreateOrderCommand(
            BigDecimal amount,
            String currency,
            String receipt,
            boolean autoCapture,
            Map<String, String> notes
    ) {}

    public record RazorpayOrderResult(
            String orderId,
            BigDecimal amount,
            BigDecimal amountPaid,
            BigDecimal amountDue,
            String currency,
            String receipt,
            String status,
            int attempts,
            Instant createdAt
    ) {}

    public record RazorpayPaymentResult(
            String paymentId,
            String orderId,
            BigDecimal amount,
            String currency,
            String status,
            String method,
            boolean captured,
            String email,
            String contact,
            String errorCode,
            String errorDescription,
            Instant createdAt
    ) {}

    public record CapturePaymentCommand(
            String razorpayPaymentId,
            BigDecimal amount,
            String currency
    ) {}

    public record RefundPaymentCommand(
            String razorpayPaymentId,
            BigDecimal amount,
            String receipt,
            Map<String, String> notes
    ) {}

    public record RazorpayRefundResult(
            String refundId,
            String paymentId,
            BigDecimal amount,
            String currency,
            String status,
            Instant createdAt
    ) {}
}
