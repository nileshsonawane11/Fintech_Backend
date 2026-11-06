package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.AccountSubtype;
import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.enums.NormalBalance;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LedgerAccountResponse(
        String ledgerAccountId,
        String accountReference,
        UUID bankAccountId,
        UUID customerId,
        String accountName,
        AccountType accountType,
        AccountSubtype accountSubtype,
        NormalBalance normalBalance,
        String currency,
        AccountStatus status,
        BigDecimal ledgerBalance,
        BigDecimal availableBalance,
        Instant createdAt,
        Instant updatedAt
) {}
