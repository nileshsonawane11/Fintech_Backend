package com.fintech.payment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record InitiateUpiTransferRequest(
        @NotBlank(message = "Debit account ID is required")
        @Size(max = 50, message = "Debit account ID must not exceed 50 characters")
        String debitAccountId,

        @NotBlank(message = "Beneficiary ID is required")
        @Size(max = 50, message = "Beneficiary ID must not exceed 50 characters")
        String beneficiaryId,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1.00", message = "Amount must be at least 1.00")
        @Digits(integer = 15, fraction = 2, message = "Amount supports up to 2 decimal places")
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Pattern(regexp = "^INR$", message = "Only INR transfers are currently supported")
        String currency,

        @Size(max = 255, message = "Remarks must not exceed 255 characters")
        String remarks
) {}
