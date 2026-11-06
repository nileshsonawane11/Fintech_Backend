package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.WithdrawalMethod;

import java.math.BigDecimal;
import java.time.Instant;

public record WithdrawalResponse(
        String transactionId,
        String accountId,
        BigDecimal amount,
        String currency,
        WithdrawalMethod withdrawalMethod,
        String referenceNumber,
        TransactionStatus status,
        Instant createdAt,
        Instant postedAt
) {}
