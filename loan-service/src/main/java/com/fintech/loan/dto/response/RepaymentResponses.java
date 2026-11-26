package com.fintech.loan.dto.response;

import com.fintech.loan.enums.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class RepaymentResponses {

    private RepaymentResponses() {}

    public record RepaymentAccountResponse(
            String repaymentAccountId,
            String loanAccountId,
            String maskedAccountNumber,
            String accountType,
            String currency,
            boolean primary,
            RepaymentAccountStatus status,
            Instant createdAt
    ) {}

    public record MandateResponse(
            String mandateId,
            String loanAccountId,
            String repaymentAccountId,
            String providerReference,
            MandateType mandateType,
            BigDecimal maxAuthorizedAmount,
            RepaymentFrequency frequency,
            LocalDate startDate,
            LocalDate endDate,
            MandateStatus status,
            String failureReason,
            Instant activatedAt,
            Instant createdAt
    ) {}

    public record InstallmentDetailResponse(
            String installmentId,
            String loanAccountId,
            Integer scheduleVersion,
            Integer installmentNumber,
            LocalDate dueDate,
            LocalDate gracePeriodEndDate,
            BigDecimal openingPrincipal,
            BigDecimal emiAmount,
            BigDecimal principalComponent,
            BigDecimal interestComponent,
            BigDecimal chargesAmount,
            BigDecimal closingPrincipal,
            BigDecimal amountPaid,
            BigDecimal remainingAmount,
            InstallmentStatus status,
            Instant paidAt
    ) {}

    public record LoanRepaymentSummaryResponse(
            String loanAccountId,
            String productCode,
            String status,
            String currency,
            BigDecimal approvedAmount,
            BigDecimal disbursedAmount,
            BigDecimal outstandingPrincipal,
            BigDecimal overdueAmount,
            BigDecimal pendingCharges,
            BigDecimal totalPrincipalRepaid,
            BigDecimal totalInterestRepaid,
            BigDecimal totalChargesRepaid,
            BigDecimal emiAmount,
            LocalDate nextDueDate,
            Integer dpd,
            long paidInstallments,
            long remainingInstallments,
            boolean closureEligible
    ) {}

    public record RepaymentResponse(
            String repaymentId,
            String repaymentReference,
            String loanAccountId,
            String installmentId,
            BigDecimal amount,
            BigDecimal principalAmount,
            BigDecimal interestAmount,
            BigDecimal chargesAmount,
            RepaymentMethod paymentMethod,
            RepaymentStatus repaymentStatus,
            String paymentReference,
            String transactionReference,
            Instant initiatedAt,
            Instant completedAt,
            String failureCode,
            String failureReason,
            String receiptReference
    ) {}

    public record RepaymentReceiptResponse(
            String receiptReference,
            String repaymentId,
            String repaymentReference,
            String loanAccountId,
            String installmentId,
            BigDecimal totalPaid,
            BigDecimal principalAllocated,
            BigDecimal interestAllocated,
            BigDecimal chargesAllocated,
            BigDecimal excessAmount,
            String currency,
            RepaymentMethod paymentMethod,
            String transactionReference,
            Instant completedAt
    ) {}

    public record RepaymentAttemptResponse(
            String attemptId,
            String repaymentId,
            Integer attemptNumber,
            String providerReference,
            String idempotencyKey,
            CollectionAttemptStatus status,
            String failureCode,
            String failureReason,
            Instant attemptTimestamp
    ) {}

    public record PrepaymentQuoteResponse(
            String loanAccountId,
            LocalDate effectiveDate,
            BigDecimal currentOutstandingPrincipal,
            BigDecimal prepaymentPrincipal,
            BigDecimal accruedInterest,
            BigDecimal prepaymentCharge,
            BigDecimal totalPayable,
            BigDecimal projectedPrincipalAfterPrepayment,
            String currency,
            Instant quoteExpiresAt
    ) {}

    public record ForeclosureQuoteResponse(
            String loanAccountId,
            LocalDate effectiveDate,
            BigDecimal remainingPrincipal,
            BigDecimal accruedInterest,
            BigDecimal pendingCharges,
            BigDecimal foreclosureCharge,
            BigDecimal totalPayable,
            String currency,
            Instant quoteExpiresAt
    ) {}

    public record ReconciliationResponse(
            String reconciliationId,
            ReconciliationType reconciliationType,
            String referenceId,
            String loanAccountId,
            String loanApplicationId,
            BigDecimal expectedAmount,
            String accountTransactionReference,
            String ledgerTransactionReference,
            String paymentReference,
            ReconciliationStatus status,
            String failureReason,
            String resolutionNotes,
            Integer retryCount,
            Instant createdAt
    ) {}
}
