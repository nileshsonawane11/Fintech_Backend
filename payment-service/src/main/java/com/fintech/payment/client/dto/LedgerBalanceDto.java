package com.fintech.payment.client.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record LedgerBalanceDto(
        String accountId,
        BigDecimal ledgerBalance,
        BigDecimal availableBalance,
        BigDecimal holdBalance,
        String currency,
        Instant asOf
) {}
