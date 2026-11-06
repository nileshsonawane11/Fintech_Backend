package com.fintech.ledger.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record BalanceResponse(
        String accountId,
        BigDecimal ledgerBalance,
        BigDecimal availableBalance,
        BigDecimal holdBalance,
        String currency,
        Instant asOf
) {
    public BalanceResponse(BigDecimal ledgerBalance, BigDecimal availableBalance, BigDecimal holdBalance, String currency) {
        this(null, ledgerBalance, availableBalance, holdBalance, currency, Instant.now());
    }
}
