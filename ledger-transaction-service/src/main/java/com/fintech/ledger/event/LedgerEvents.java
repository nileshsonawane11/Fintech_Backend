package com.fintech.ledger.event;

import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.enums.TransactionDirection;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class LedgerEvents {

    private LedgerEvents() {}

    public record TransactionInitiatedPayload(
            String transactionId,
            TransactionType transactionType,
            BigDecimal amount,
            String currency,
            String referenceNumber,
            String initiatedBy,
            Instant initiatedAt
    ) {}

    public record TransactionProcessingPayload(
            String transactionId,
            TransactionType transactionType,
            BigDecimal amount,
            String currency,
            Instant processingAt
    ) {}

    public record TransactionPostedPayload(
            String transactionId,
            TransactionType transactionType,
            BigDecimal amount,
            String currency,
            String debitLedgerEntryId,
            String creditLedgerEntryId,
            LocalDate valueDate,
            Instant postedAt
    ) {}

    public record TransactionFailedPayload(
            String transactionId,
            TransactionType transactionType,
            BigDecimal amount,
            String currency,
            String reasonCode,
            String failureReason,
            Instant failedAt
    ) {}

    public record TransactionReversedPayload(
            String originalTransactionId,
            String reversalTransactionId,
            BigDecimal amount,
            String currency,
            String reasonCode,
            String reversedBy,
            Instant reversedAt
    ) {}

    public record BalanceUpdatedPayload(
            String accountId,
            String ledgerAccountId,
            BigDecimal ledgerBalance,
            BigDecimal availableBalance,
            BigDecimal holdBalance,
            String currency,
            Instant updatedAt
    ) {
        public BalanceUpdatedPayload(String accountId, BigDecimal ledgerBalance, BigDecimal availableBalance,
                                     BigDecimal holdBalance, String currency, Instant updatedAt) {
            this(accountId, accountId, ledgerBalance, availableBalance, holdBalance, currency, updatedAt);
        }
    }

    public record ReconciliationCompletedPayload(
            String reconciliationId,
            String status,
            Integer totalAccounts,
            Integer matchedAccounts,
            Integer mismatchedAccounts,
            BigDecimal differenceAmount,
            Instant completedAt
    ) {}

    public record ReconciliationDiscrepancyDetectedPayload(
            String reconciliationId,
            String accountId,
            String discrepancyType,
            BigDecimal expectedAmount,
            BigDecimal actualAmount,
            BigDecimal differenceAmount,
            Instant detectedAt
    ) {
        public String ledgerAccountId() {
            return accountId;
        }
    }
}
