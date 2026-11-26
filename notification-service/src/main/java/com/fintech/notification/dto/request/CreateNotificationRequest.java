package com.fintech.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateNotificationRequest(
        String eventId,
        @NotBlank(message = "Recipient ID is required")
        @Size(max = 50)
        String recipientId,
        @Size(max = 50)
        String targetRole,
        @NotBlank(message = "Template code is required")
        @Size(max = 100)
        String templateCode,
        @Size(max = 20)
        String channel,
        @NotBlank(message = "Title is required")
        @Size(max = 255)
        String title,
        @NotBlank(message = "Body is required")
        String body,
        @Size(max = 100)
        String referenceId,
        Instant createdAt
) {
}
