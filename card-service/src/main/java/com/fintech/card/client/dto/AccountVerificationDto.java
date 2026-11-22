package com.fintech.card.client.dto;

import java.time.Instant;

public record AccountVerificationDto(
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
