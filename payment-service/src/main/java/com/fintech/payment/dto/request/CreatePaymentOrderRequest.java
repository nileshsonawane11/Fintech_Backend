package com.fintech.payment.dto.request;

import com.fintech.payment.enums.PaymentPurpose;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Map;

public record CreatePaymentOrderRequest(
        @NotNull(message = "Payment purpose is required")
        @Schema(description = "Payment purpose", example = "ACCOUNT_DEPOSIT")
        PaymentPurpose purpose,

        @Schema(description = "FinBank destination account ID (required for ACCOUNT_DEPOSIT)", example = "ACC-1001")
        String destinationAccountId,

        @Schema(description = "Business reference (e.g. loanAccountId or investmentId)", example = "LN-1001")
        String businessReference,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1.00", message = "Amount must be at least 1.00")
        @Schema(description = "Payment amount in major currency units", example = "5000.00")
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO code")
        @Schema(description = "3-letter currency code", example = "INR")
        String currency,

        @Schema(description = "Optional metadata notes")
        Map<String, String> notes
) {}
