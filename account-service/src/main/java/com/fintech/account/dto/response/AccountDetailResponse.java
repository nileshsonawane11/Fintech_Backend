package com.fintech.account.dto.response;

import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import java.time.Instant;

public record AccountDetailResponse(
        String accountId,
        String accountNumber,
        AccountType accountType,
        String productCode,
        AccountStatus status,
        String currency,
        Instant openedAt,
        BalanceResponse balance
) {}
