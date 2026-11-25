package com.fintech.payment.client.dto;

import java.time.Instant;

public record InternalAccountDto(
        String accountId,
        String accountNumberMasked,
        String customerId,
        String identitySubject,
        String accountType,
        String productCode,
        String status,
        String currency,
        Instant openedAt
) {}
