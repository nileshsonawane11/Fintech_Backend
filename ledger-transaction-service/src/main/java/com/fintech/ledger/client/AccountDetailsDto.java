package com.fintech.ledger.client;

import java.time.Instant;
import java.util.UUID;

public record AccountDetailsDto(
        UUID id,
        String accountId,
        String maskedAccountNumber,
        UUID customerId,
        String productCode,
        String accountType,
        String currency,
        String status,
        Instant openedAt
) {}
