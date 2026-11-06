package com.fintech.ledger.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class AccountEvents {

    private AccountEvents() {}

    public record AccountCreatedPayload(
            String accountId,
            String maskedAccountNumber,
            String customerId,
            String productCode,
            String accountType,
            String currency,
            String status,
            Instant openedAt
    ) {}

    public record AccountStatusChangedPayload(
            String accountId,
            String previousStatus,
            String newStatus,
            String reasonCode,
            String remarks,
            String changedBy,
            Instant changedAt
    ) {}

    public record AccountClosedPayload(
            String accountId,
            String reasonCode,
            String remarks,
            String closedBy,
            Instant closedAt
    ) {}

    public record AccountHoldRequestedPayload(
            String holdId,
            String accountId,
            BigDecimal amount,
            String currency,
            String reasonCode,
            String createdBy,
            Instant createdAt
    ) {}

    public record AccountHoldReleaseRequestedPayload(
            String holdId,
            String accountId,
            BigDecimal amount,
            String currency,
            String reasonCode,
            String releasedBy,
            Instant releasedAt
    ) {}
}
