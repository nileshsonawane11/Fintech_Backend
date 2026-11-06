package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.TransactionDirection;
import com.fintech.ledger.enums.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record TransactionReceiptResponse(
        String receiptNumber,
        String transactionId,
        String referenceNumber,
        String accountId,
        String counterpartyAccountId,
        TransactionType transactionType,
        TransactionDirection direction,
        BigDecimal amount,
        String currency,
        String narrative,
        String status,
        LocalDate valueDate,
        Instant postedAt,
        String bankName,
        String issuedBy
) {}
