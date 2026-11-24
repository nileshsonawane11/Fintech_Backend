package com.fintech.ledger.dto.response;

import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionSummaryResponse(
        UUID id,
        String transactionId,
        TransactionType transactionType,
        TransactionStatus transactionStatus,
        String referenceNumber,
        String idempotencyKey,
        String correlationId,
        String currency,
        BigDecimal totalDebit,
        BigDecimal totalCredit,
        String narrative,
        String initiatedBy,
        String sourceService,
        LocalDate valueDate,
        Instant initiatedAt,
        Instant postedAt,
        Instant reversedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static TransactionSummaryResponse fromEntity(LedgerTransaction tx) {
        if (tx == null) {
            return null;
        }
        return new TransactionSummaryResponse(
                tx.getId(),
                tx.getTransactionId(),
                tx.getTransactionType(),
                tx.getTransactionStatus(),
                tx.getReferenceNumber(),
                tx.getIdempotencyKey(),
                tx.getCorrelationId(),
                tx.getCurrency(),
                tx.getTotalDebit(),
                tx.getTotalCredit(),
                tx.getNarrative(),
                tx.getInitiatedBy(),
                tx.getSourceService(),
                tx.getValueDate(),
                tx.getInitiatedAt(),
                tx.getPostedAt(),
                tx.getReversedAt(),
                tx.getCreatedAt(),
                tx.getUpdatedAt()
        );
    }
}
