package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.TransactionDirection;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record TransactionResponse(
        String transactionId,
        String accountId,
        TransactionType transactionType,
        TransactionDirection direction,
        BigDecimal amount,
        String currency,
        TransactionStatus status,
        String description,
        String referenceNumber,
        LocalDate valueDate,
        Instant initiatedAt,
        Instant postedAt,
        Instant reversedAt,
        Instant createdAt
) {
    public TransactionResponse(String transactionId, String accountId, TransactionType transactionType,
                               TransactionDirection direction, BigDecimal amount, String currency,
                               TransactionStatus status, String description, String referenceNumber,
                               LocalDate valueDate, Instant createdAt) {
        this(transactionId, accountId, transactionType, direction, amount, currency, status,
             description, referenceNumber, valueDate, createdAt, createdAt, null, createdAt);
    }
}
