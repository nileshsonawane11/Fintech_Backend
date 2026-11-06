package com.fintech.ledger.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record BalanceHistoryItem(
        String accountId,
        LocalDate valueDate,
        BigDecimal ledgerBalance,
        BigDecimal availableBalance,
        BigDecimal holdBalance,
        String currency,
        String referenceNumber,
        Instant recordedAt
) {}
