package com.fintech.ledger.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AccountDetailsDto(
        UUID id,
        String accountId,
        @JsonAlias({"accountNumber", "accountNumberMasked", "maskedAccountNumber"})
        String accountNumber,
        String customerId,
        String identitySubject,
        UUID productId,
        String productCode,
        String accountType,
        String currency,
        @JsonAlias({"accountStatus", "status"})
        String status,
        Instant openedAt
) {
    public AccountDetailsDto(String accountId, String accountNumber, String customerId, String identitySubject,
                             String accountType, String productCode, String currency, String status, Instant openedAt) {
        this(UUID.randomUUID(), accountId, accountNumber, customerId, identitySubject, UUID.randomUUID(), productCode, accountType, currency, status, openedAt);
    }

    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(status);
    }
}
