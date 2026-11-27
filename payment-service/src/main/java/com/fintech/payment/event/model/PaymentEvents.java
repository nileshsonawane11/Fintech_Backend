package com.fintech.payment.event.model;

import com.fintech.payment.enums.PaymentPurpose;

import java.math.BigDecimal;
import java.time.Instant;

public final class PaymentEvents {

    private PaymentEvents() {}

    public record PaymentOrderCreatedPayload(
            String paymentId,
            String identitySubject,
            String destinationAccountId,
            String razorpayOrderId,
            BigDecimal amount,
            String currency,
            PaymentPurpose purpose,
            String businessReference,
            Instant occurredAt
    ) {}

    public record PaymentAuthorizedPayload(
            String paymentId,
            String identitySubject,
            String destinationAccountId,
            String razorpayOrderId,
            String razorpayPaymentId,
            BigDecimal amount,
            String currency,
            PaymentPurpose purpose,
            String businessReference,
            Instant occurredAt
    ) {}

    public record PaymentCapturedPayload(
            String paymentId,
            String identitySubject,
            String destinationAccountId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String paymentMethod,
            BigDecimal amount,
            String currency,
            PaymentPurpose purpose,
            String businessReference,
            Instant occurredAt
    ) {}

    public record PaymentFailedPayload(
            String paymentId,
            String identitySubject,
            String destinationAccountId,
            String razorpayOrderId,
            String razorpayPaymentId,
            BigDecimal amount,
            String currency,
            PaymentPurpose purpose,
            String businessReference,
            String failureCode,
            String failureReason,
            Instant occurredAt
    ) {}

    public record PaymentRefundedPayload(
            String paymentId,
            String refundId,
            String identitySubject,
            String destinationAccountId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpayRefundId,
            BigDecimal refundAmount,
            String currency,
            PaymentPurpose purpose,
            String businessReference,
            boolean fullRefund,
            Instant occurredAt
    ) {}

    public record ExternalAccountDepositConfirmedPayload(
            String paymentId,
            String identitySubject,
            String destinationAccountId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String paymentMethod,
            BigDecimal amount,
            String currency,
            PaymentPurpose purpose,
            Instant occurredAt
    ) {}

    public record LoanRepaymentPaymentConfirmedPayload(
            String paymentId,
            String identitySubject,
            String loanAccountId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String paymentMethod,
            BigDecimal amount,
            String currency,
            PaymentPurpose purpose,
            Instant occurredAt
    ) {}

    public record InvestmentPaymentConfirmedPayload(
            String paymentId,
            String identitySubject,
            String investmentReference,
            String razorpayOrderId,
            String razorpayPaymentId,
            String paymentMethod,
            BigDecimal amount,
            String currency,
            PaymentPurpose purpose,
            Instant occurredAt
    ) {}

    public record ReconciliationStartedPayload(
            String runId,
            String scope,
            Instant startedAt
    ) {}

    public record ReconciliationCompletedPayload(
            String runId,
            int checkedCount,
            int mismatchCount,
            Instant completedAt
    ) {}

    public record ReconciliationMismatchDetectedPayload(
            String reconciliationId,
            String runId,
            String targetType,
            String targetId,
            String discrepancyType,
            String internalStatus,
            String providerStatus,
            Instant detectedAt
    ) {}
}
