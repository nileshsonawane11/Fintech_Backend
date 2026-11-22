package com.fintech.card.event.model;

import java.time.Instant;

public record CardIssuedEvent(
        String cardId,
        String cardApplicationId,
        String customerId,
        String maskedCardNumber,
        String cardType,
        String linkedAccountId,
        Instant issuedAt
) {}
