package com.fintech.payment.event.model;

import java.math.BigDecimal;
import java.time.Instant;

public final class PaymentEvents {

    private PaymentEvents() {}

    // Incoming Payment Events
    public record IncomingPaymentInitiatedPayload(
            String receiverId, String finbankAccountId, String providerVaId, Instant occurredAt) {}

    public record IncomingPaymentReceivedPayload(
            String incomingPaymentId, String finbankAccountId, BigDecimal amount, String currency,
            String channel, String utr, Instant receivedAt) {}

    public record IncomingPaymentVerifiedPayload(
            String incomingPaymentId, String finbankAccountId, BigDecimal amount, String currency, Instant verifiedAt) {}

    public record IncomingPaymentCreditedPayload(
            String incomingPaymentId, String finbankAccountId, String ledgerTransactionId,
            BigDecimal netCreditAmount, String currency, Instant creditedAt) {}

    public record IncomingPaymentFailedPayload(
            String incomingPaymentId, String finbankAccountId, String reason, Instant failedAt) {}

    public record IncomingPaymentRefundedPayload(
            String incomingPaymentId, String refundId, String ledgerRefundTxId,
            BigDecimal refundAmount, String currency, Instant refundedAt) {}

    // Outgoing Transfer Events
    public record TransferInitiatedPayload(
            String paymentId, String transactionId, String debitAccountId, String beneficiaryId,
            BigDecimal amount, BigDecimal feeAmount, BigDecimal taxAmount, String currency, String transferMode, Instant initiatedAt) {}

    public record TransferSubmittedPayload(
            String paymentId, String providerPayoutId, String ledgerTransactionId, Instant submittedAt) {}

    public record TransferProcessingPayload(
            String paymentId, String providerPayoutId, String providerStatus, String utr, Instant updatedAt) {}

    public record TransferCompletedPayload(
            String paymentId, String providerPayoutId, String utr, String ledgerSettlementTxId,
            BigDecimal amount, String currency, Instant completedAt) {}

    public record TransferFailedPayload(
            String paymentId, String providerPayoutId, String failureCode, String failureReason, Instant failedAt) {}

    public record TransferReversedPayload(
            String paymentId, String providerPayoutId, String ledgerReversalTxId,
            BigDecimal refundedTotalAmount, String currency, String reason, Instant reversedAt) {}

    // Beneficiary Events
    public record BeneficiaryCreatedPayload(
            String beneficiaryId, String beneficiaryType, String maskedDestination, Instant createdAt) {}

    public record BeneficiaryValidationInitiatedPayload(
            String beneficiaryId, String validationId, String providerValidationId, String mode, Instant initiatedAt) {}

    public record BeneficiaryVerifiedPayload(
            String beneficiaryId, String validationId, BigDecimal nameMatchScore, Instant verifiedAt) {}

    public record BeneficiaryValidationFailedPayload(
            String beneficiaryId, String validationId, String reason, Instant failedAt) {}

    public record BeneficiaryDeactivatedPayload(
            String beneficiaryId, Instant deactivatedAt) {}

    // Reconciliation Events
    public record ReconciliationStartedPayload(
            String runId, String scope, Instant startedAt) {}

    public record ReconciliationCompletedPayload(
            String runId, int checkedCount, int mismatchCount, Instant completedAt) {}

    public record ReconciliationMismatchDetectedPayload(
            String reconciliationId, String runId, String targetType, String targetId,
            String discrepancyType, String internalStatus, String providerStatus, Instant detectedAt) {}
}
