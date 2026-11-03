package com.fintech.account.dto.response;

import java.math.BigDecimal;

public record BalanceResponse(
        BigDecimal ledgerBalance,
        BigDecimal availableBalance,
        BigDecimal holdBalance,
        String currency
) {}
