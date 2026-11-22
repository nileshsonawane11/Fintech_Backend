package com.fintech.card.event.model;

import java.time.Instant;

public record CardApplicationValidatedEvent(
        String cardApplicationId,
        String customerId,
        String linkedAccountId,
        String deliveryAddressId,
        String cardType,
        String status,
        Instant validatedAt
) {}
