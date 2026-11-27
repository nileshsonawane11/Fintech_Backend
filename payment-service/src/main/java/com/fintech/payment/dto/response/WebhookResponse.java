package com.fintech.payment.dto.response;

import java.time.Instant;

public record WebhookResponse(
        String eventId,
        String eventType,
        String status,
        String message,
        Instant processedAt
) {
    public boolean isReceived() {
        return true;
    }
}
