package com.fintech.notification.dto.event;

import java.time.Instant;
import java.util.Map;

public record NotificationEventPayload(
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
}
