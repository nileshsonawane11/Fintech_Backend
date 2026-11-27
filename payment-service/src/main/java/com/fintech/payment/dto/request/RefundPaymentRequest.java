package com.fintech.payment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record RefundPaymentRequest(
        @DecimalMin(value = "1.00", message = "Refund amount must be at least 1.00")
        BigDecimal amount,

        @NotBlank(message = "Refund reason is required")
        @Size(max = 500)
        String reason
) {}
