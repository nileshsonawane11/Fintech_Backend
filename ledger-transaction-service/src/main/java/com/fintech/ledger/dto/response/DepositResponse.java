package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.DepositMethod;
import com.fintech.ledger.enums.TransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record DepositResponse(
        String transactionId,
        String accountId,
        BigDecimal amount,
        String currency,
        DepositMethod depositMethod,
        String referenceNumber,
        TransactionStatus status,
        Instant createdAt,
        Instant postedAt
) {}
