package com.fintech.account.dto.response;

import com.fintech.account.enums.AccountType;
import java.math.BigDecimal;

public record AccountProductResponse(
        String productCode,
        String productName,
        String description,
        AccountType accountType,
        String currency,
        BigDecimal minimumBalance,
        BigDecimal minimumInitialFunding,
        BigDecimal interestRate,
        BigDecimal dailyTransferLimit,
        BigDecimal monthlyTransferLimit,
        Integer minimumAge,
        Integer maximumAge,
        boolean requiresKyc,
        boolean active
) {}
