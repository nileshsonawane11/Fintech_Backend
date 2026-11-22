package com.fintech.card.event.model;

import java.math.BigDecimal;
import java.time.Instant;

public record CardApplicationSubmittedEvent(
        String cardApplicationId,
        String customerId,
        String linkedAccountId,
        String deliveryAddressId,
        String cardType,
        String cardName,
        String productSlug,
        BigDecimal requestedLimit,
        String status,
        Instant submittedAt
) {}
