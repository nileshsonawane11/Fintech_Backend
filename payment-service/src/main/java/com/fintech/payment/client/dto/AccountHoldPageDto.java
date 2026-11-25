package com.fintech.payment.client.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record AccountHoldPageDto(
        List<AccountHoldDto> items,
        String nextCursor,
        boolean hasMore,
        int limit
) {
    public record AccountHoldDto(
            String holdId,
            String accountId,
            BigDecimal amount,
            String currency,
            String reasonCode,
            String status,
            String remarks,
            String createdBy,
            String releasedBy,
            Instant createdAt,
            Instant releasedAt,
            String releaseReason
    ) {}
}
