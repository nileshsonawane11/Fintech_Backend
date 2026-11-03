package com.fintech.account.dto.response;

import com.fintech.account.enums.HoldStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record AccountHoldResponse(
        String holdId,
        String accountId,
        BigDecimal amount,
        String currency,
        String reasonCode,
        HoldStatus status,
        String remarks,
        String createdBy,
        String releasedBy,
        Instant createdAt,
        Instant releasedAt,
        String releaseReason
) {
    public static AccountHoldResponse ofSummary(
            String holdId,
            String accountId,
            BigDecimal amount,
            String currency,
            String reasonCode,
            HoldStatus status,
            String createdBy,
            Instant createdAt) {
        return new AccountHoldResponse(
                holdId, accountId, amount, currency, reasonCode, status,
                null, createdBy, null, createdAt, null, null
        );
    }
}
