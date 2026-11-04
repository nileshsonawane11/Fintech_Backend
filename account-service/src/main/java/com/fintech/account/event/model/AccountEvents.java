package com.fintech.account.event.model;

import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import com.fintech.account.enums.ApplicationStatus;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.enums.NomineeRelationship;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class AccountEvents {

    private AccountEvents() {}

    public record AccountApplicationSubmittedPayload(
            String applicationNumber,
            String customerId,
            String productCode,
            BigDecimal initialFundingAmount,
            String currency,
            ApplicationStatus status,
            Instant submittedAt
    ) {}

    public record AccountApplicationApprovedPayload(
            String applicationNumber,
            String customerId,
            String productCode,
            String accountId,
            String approvedBy,
            Instant approvedAt
    ) {}

    public record AccountApplicationRejectedPayload(
            String applicationNumber,
            String customerId,
            String productCode,
            String reasonCode,
            String remarks,
            String rejectedBy,
            Instant rejectedAt
    ) {}

    public record AccountApplicationCancelledPayload(
            String applicationNumber,
            String customerId,
            Instant cancelledAt
    ) {}

    public record AccountCreatedPayload(
            String accountId,
            String maskedAccountNumber,
            String customerId,
            String productCode,
            AccountType accountType,
            String currency,
            AccountStatus status,
            Instant openedAt
    ) {}

    public record AccountActivatedPayload(
            String accountId,
            String maskedAccountNumber,
            String customerId,
            Instant activatedAt
    ) {}

    public record AccountFrozenPayload(
            String accountId,
            String reasonCode,
            String remarks,
            String frozenBy,
            Instant frozenAt
    ) {}

    public record AccountUnfrozenPayload(
            String accountId,
            String reasonCode,
            String remarks,
            String unfrozenBy,
            Instant unfrozenAt
    ) {}

    public record AccountBlockedPayload(
            String accountId,
            String reasonCode,
            String remarks,
            String blockedBy,
            Instant blockedAt
    ) {}

    public record AccountClosedPayload(
            String accountId,
            String reasonCode,
            String remarks,
            String closedBy,
            Instant closedAt
    ) {}

    public record AccountHoldPlacedPayload(
            String holdId,
            String accountId,
            BigDecimal amount,
            String currency,
            String reasonCode,
            HoldStatus status,
            String createdBy,
            Instant createdAt
    ) {}

    public record AccountHoldReleasedPayload(
            String holdId,
            String accountId,
            BigDecimal amount,
            String currency,
            String reasonCode,
            HoldStatus status,
            String releasedBy,
            Instant releasedAt
    ) {}

    public record AccountNomineeAddedPayload(
            UUID nomineeId,
            String accountId,
            String nomineeName,
            NomineeRelationship relationship,
            Integer allocationPercentage,
            Instant createdAt
    ) {}

    public record AccountNomineeUpdatedPayload(
            UUID nomineeId,
            String accountId,
            String nomineeName,
            NomineeRelationship relationship,
            Integer allocationPercentage,
            Instant updatedAt
    ) {}

    public record AccountNomineeDeletedPayload(
            UUID nomineeId,
            String accountId,
            Instant deletedAt
    ) {}
}
