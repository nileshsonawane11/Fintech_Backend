package com.fintech.loan.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
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
) {
}
