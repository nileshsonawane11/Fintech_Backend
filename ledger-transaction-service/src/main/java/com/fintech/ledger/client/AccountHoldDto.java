package com.fintech.ledger.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AccountHoldDto(
        String holdId,
        String accountId,
        BigDecimal amount,
        String currency,
        String reasonCode,
        @JsonAlias({"holdStatus", "status"})
        String status,
        String remarks,
        String createdBy,
        String releasedBy,
        Instant createdAt,
        Instant releasedAt,
        String releaseReason
) {
    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(status);
    }
}
