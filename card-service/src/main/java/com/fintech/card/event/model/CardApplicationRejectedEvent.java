package com.fintech.card.event.model;

import java.time.Instant;

public record CardApplicationRejectedEvent(
        String cardApplicationId,
        String customerId,
        String rejectionReason,
        Instant rejectedAt,
        String rejectedBy
) {}
