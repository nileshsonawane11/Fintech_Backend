package com.fintech.account.dto.response;

import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;

import java.time.Instant;

public record InternalAccountResponse(
        String accountId,
        String accountNumberMasked,
        String customerId,
        String identitySubject,
        AccountType accountType,
        String productCode,
        AccountStatus status,
        String currency,
        Instant openedAt
) {}
