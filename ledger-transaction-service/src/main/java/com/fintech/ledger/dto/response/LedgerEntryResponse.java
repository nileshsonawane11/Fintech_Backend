package com.fintech.ledger.dto.response;

import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.EntryType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LedgerEntryResponse(
        UUID id,
        String entryId,
        String transactionId,
        String correlationId,
        String accountId,
        EntryType entryType,
        BigDecimal amount,
        String currency,
        LocalDate valueDate,
        String narrative,
        String referenceNumber,
        Instant createdAt,
        TransactionSummaryResponse transaction
) {
    public static LedgerEntryResponse fromEntity(LedgerEntry entry) {
        if (entry == null) {
            return null;
        }
        LedgerTransaction tx = entry.getTransaction();
        String txId = tx != null ? tx.getTransactionId() : null;
        String corrId = tx != null ? tx.getCorrelationId() : null;
        TransactionSummaryResponse txSummary = TransactionSummaryResponse.fromEntity(tx);

        return new LedgerEntryResponse(
                entry.getId(),
                entry.getEntryId(),
                txId,
                corrId,
                entry.getAccountId(),
                entry.getEntryType(),
                entry.getAmount(),
                entry.getCurrency(),
                entry.getValueDate(),
                entry.getNarrative(),
                entry.getReferenceNumber(),
                entry.getCreatedAt(),
                txSummary
        );
    }
}
