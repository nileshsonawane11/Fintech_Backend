package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.TransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record LedgerPostingResponse(
        String transactionId,
        TransactionStatus status,
        BigDecimal amount,
        String currency,
        String debitLedgerEntryId,
        String creditLedgerEntryId,
        List<String> entryIds,
        Instant postedAt
) {
    public LedgerPostingResponse(String transactionId, TransactionStatus status, BigDecimal amount,
                                 String currency, String debitLedgerEntryId, String creditLedgerEntryId,
                                 Instant postedAt) {
        this(transactionId, status, amount, currency, debitLedgerEntryId, creditLedgerEntryId,
             List.of(debitLedgerEntryId != null ? debitLedgerEntryId : "", creditLedgerEntryId != null ? creditLedgerEntryId : ""), postedAt);
    }
}
