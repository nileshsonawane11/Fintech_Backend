package com.fintech.payment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record VerifyPaymentRequest(
        @NotBlank(message = "razorpayOrderId is required")
        @Schema(description = "Razorpay Order ID", example = "order_DBJOWzybf0sJbb")
        String razorpayOrderId,

        @NotBlank(message = "razorpayPaymentId is required")
        @Schema(description = "Razorpay Payment ID", example = "pay_DBJOWzybf0sJbb")
        String razorpayPaymentId,

        @NotBlank(message = "razorpaySignature is required")
        @Schema(description = "Razorpay Checkout HMAC-SHA256 signature")
        String razorpaySignature
) {}
