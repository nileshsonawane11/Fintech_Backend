package com.fintech.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReversePaymentRequest(
        @NotBlank(message = "Reason code is required")
        @Size(max = 100)
        String reasonCode,

        @Size(max = 255)
        String remarks
) {}
