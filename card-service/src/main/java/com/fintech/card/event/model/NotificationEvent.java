package com.fintech.card.event.model;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record NotificationEvent(
        String eventId,
        String eventType,
        String eventVersion,
        String recipientId,
        String sourceService,
        String aggregateId,
        String aggregateType,
        String title,
        String message,
        String category,
        String priority,
        Instant timestamp,
        Map<String, Object> metadata,
        String channel,
        String targetRole
) {
    public static NotificationEvent of(
            String eventType,
            String recipientId,
            String aggregateId,
            String aggregateType,
            String title,
            String message,
            String category,
            String priority,
            Map<String, Object> metadata) {
        return new NotificationEvent(
                "CRD-NOTIF-" + UUID.randomUUID(),
                eventType,
                "1.0",
                recipientId,
                "card-service",
                aggregateId,
                aggregateType,
                title,
                message,
                category,
                priority,
                Instant.now(),
                metadata,
                "IN_APP",
                "CUSTOMER"
        );
    }
}
