package com.fintech.card.event.model;

import java.time.Instant;

public record CardApplicationCancelledEvent(
        String cardApplicationId,
        String customerId,
        String reason,
        Instant cancelledAt
) {}
