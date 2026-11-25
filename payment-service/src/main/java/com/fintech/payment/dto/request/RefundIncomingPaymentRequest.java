package com.fintech.payment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record RefundIncomingPaymentRequest(
        @DecimalMin(value = "0.01", message = "Refund amount must be positive")
        @Digits(integer = 15, fraction = 2)
        BigDecimal amount,

        @NotBlank(message = "Refund reason is required")
        @Size(max = 255)
        String reason
) {}
