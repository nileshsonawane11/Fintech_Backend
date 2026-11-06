package com.fintech.ledger.dto.request;

import com.fintech.ledger.enums.WithdrawalMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record WithdrawalRequest(
        @NotBlank(message = "Account ID is required")
        String accountId,

        @NotNull(message = "Withdrawal amount is required")
        @DecimalMin(value = "0.01", message = "Withdrawal amount must be greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter ISO code")
        String currency,

        @NotNull(message = "Withdrawal method is required")
        WithdrawalMethod withdrawalMethod,

        String remarks
) {}
