package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;

public record TransferResponse(
        String transactionId,
        TransactionStatus status,
        TransactionType transactionType,
        BigDecimal amount,
        String currency,
        String sourceAccountId,
        String destinationAccountId,
        String referenceNumber,
        Instant createdAt
) {}
