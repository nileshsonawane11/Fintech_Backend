package com.fintech.card.event.model;

import java.math.BigDecimal;
import java.time.Instant;

public record CardApplicationApprovedEvent(
        String cardApplicationId,
        String customerId,
        String cardId,
        BigDecimal approvedLimit,
        Instant approvedAt,
        String approvedBy
) {}
