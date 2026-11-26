package com.fintech.notification.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.notification.dto.request.CreateNotificationRequest;
import com.fintech.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class LoanNotificationKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(LoanNotificationKafkaConsumer.class);

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public LoanNotificationKafkaConsumer(NotificationService notificationService, ObjectMapper objectMapper) {
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.loan-notifications:loan.notification.events.v1}",
            groupId = "${spring.kafka.consumer.group-id:notification-service-group}"
    )
    public void onLoanNotificationEvent(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(rawMessage);
            JsonNode payload = root.has("payload") ? root.get("payload") : root;

            String eventId = textOrNull(payload, "eventId");
            if (eventId == null) {
                eventId = textOrNull(root, "eventId");
            }
            String recipientId = textOrNull(payload, "recipientId");
            String targetRole = textOrNull(payload, "targetRole");
            String templateCode = textOrNull(payload, "templateCode");
            String channel = textOrNull(payload, "channel");
            String title = textOrNull(payload, "title");
            String body = textOrNull(payload, "body");
            String referenceId = textOrNull(payload, "referenceId");
            Instant createdAt = parseInstant(textOrNull(payload, "createdAt"));

            if (recipientId == null || templateCode == null || title == null || body == null) {
                log.warn("Ignoring malformed loan notification event without required fields: {}", rawMessage);
                return;
            }

            CreateNotificationRequest req = new CreateNotificationRequest(
                    eventId,
                    recipientId,
                    targetRole,
                    templateCode,
                    channel != null ? channel : "IN_APP",
                    title,
                    body,
                    referenceId,
                    createdAt
            );
            notificationService.recordNotification(req);
        } catch (Exception ex) {
            log.error("Failed to process loan notification Kafka event: {}", ex.getMessage(), ex);
            throw new IllegalStateException("Failed to process loan notification event", ex);
        }
    }

    private String textOrNull(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) return null;
        String val = node.get(field).asText();
        return val != null && !val.isBlank() ? val : null;
    }

    private Instant parseInstant(String value) {
        if (value == null) return Instant.now();
        try {
            return Instant.parse(value);
        } catch (Exception e) {
            return Instant.now();
        }
    }
}
