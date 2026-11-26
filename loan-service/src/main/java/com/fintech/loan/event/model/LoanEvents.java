package com.fintech.loan.event.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class LoanEvents {

    private LoanEvents() {
    }

    public record LoanApplicationSubmittedPayload(
            String loanApplicationId,
            String customerId,
            String identitySubject,
            String productCode,
            BigDecimal requestedAmount,
            Integer tenureMonths,
            String disbursementAccountId,
            BigDecimal indicativeEmi,
            BigDecimal calculatedFoir,
            String appliedOfferCode,
            Integer appliedOfferVersion,
            Instant submittedAt
    ) {}

    public record LoanApplicationStatusChangedPayload(
            String loanApplicationId,
            String customerId,
            String identitySubject,
            String previousStatus,
            String newStatus,
            String changedBy,
            String changedByRole,
            String remarks,
            String reason,
            Instant changedAt
    ) {}

    public record LoanApplicationApprovedPayload(
            String loanApplicationId,
            String customerId,
            String identitySubject,
            String productCode,
            String offerId,
            BigDecimal approvedAmount,
            BigDecimal interestRate,
            Integer tenureMonths,
            String approvedBy,
            Instant approvedAt
    ) {}

    public record LoanApplicationRejectedPayload(
            String loanApplicationId,
            String customerId,
            String identitySubject,
            String productCode,
            String reason,
            String rejectedBy,
            Instant rejectedAt
    ) {}

    public record LoanApplicationDisbursedPayload(
            String loanApplicationId,
            String loanAccountId,
            String customerId,
            String identitySubject,
            String disbursementAccountId,
            BigDecimal disbursedAmount,
            BigDecimal interestRate,
            Integer tenureMonths,
            BigDecimal emiAmount,
            Instant disbursedAt
    ) {}

    public record LoanOfferLifecyclePayload(
            String offerId,
            String offerCode,
            String offerName,
            Integer versionNumber,
            String status,
            Instant validFrom,
            Instant validTo,
            String actor,
            Instant occurredAt
    ) {}

    public record LoanProductLifecyclePayload(
            String productId,
            String productCode,
            String productName,
            String loanCategory,
            String status,
            String actor,
            Instant occurredAt
    ) {}

    public record LoanNotificationPayload(
            String eventId,
            String recipientId,
            String targetRole,
            String templateCode,
            String channel,
            String title,
            String body,
            String referenceId,
            List<String> metadataTags,
            Instant createdAt
    ) {}
}
