package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.HoldStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record AccountHoldResponse(
        String holdId,
        String accountId,
        BigDecimal amount,
        String currency,
        HoldStatus status,
        BigDecimal availableBalance,
        String reasonCode,
        String remarks,
        String referenceNumber,
        String createdBy,
        String releasedBy,
        Instant createdAt,
        Instant releasedAt
) {
    public AccountHoldResponse(String holdId, String accountId, BigDecimal amount, String currency,
                               HoldStatus status, BigDecimal availableBalance, Instant createdAt) {
        this(holdId, accountId, amount, currency, status, availableBalance, null, null, null, null, null, createdAt, null);
    }
}
