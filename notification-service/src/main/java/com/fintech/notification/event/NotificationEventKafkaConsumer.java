package com.fintech.notification.event;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.notification.dto.event.NotificationEventPayload;
import com.fintech.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Set;

@Component
public class NotificationEventKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventKafkaConsumer.class);
    private static final Set<String> SUPPORTED_VERSIONS = Set.of("1.0", "1");

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public NotificationEventKafkaConsumer(NotificationService notificationService, ObjectMapper objectMapper) {
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.notification-events:notification.events.v1}",
            groupId = "${spring.kafka.consumer.group-id:notification-service-group}"
    )
    public void onNotificationEvent(String rawMessage) {
        if (rawMessage == null || rawMessage.isBlank()) {
            log.warn("Ignoring blank notification Kafka message");
            return;
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(rawMessage);
            if (root != null && root.isTextual()) {
                root = objectMapper.readTree(root.asText());
            }
        } catch (Exception ex) {
            log.error("Rejecting malformed JSON notification event: {}", ex.getMessage());
            return;
        }

        JsonNode payload = root.has("payload") && root.get("payload").isObject()
                ? root.get("payload")
                : root;

        String eventId = firstNonBlank(textOrNull(payload, "eventId"), textOrNull(root, "eventId"));
        String eventType = firstNonBlank(textOrNull(payload, "eventType"), textOrNull(root, "eventType"));
        String eventVersion = firstNonBlank(textOrNull(payload, "eventVersion"), textOrNull(root, "eventVersion"));
        String recipientId = textOrNull(payload, "recipientId");
        String sourceService = textOrNull(payload, "sourceService");
        String aggregateId = firstNonBlank(textOrNull(payload, "aggregateId"), textOrNull(root, "aggregateId"));
        String aggregateType = firstNonBlank(textOrNull(payload, "aggregateType"), textOrNull(root, "aggregateType"));
        String title = textOrNull(payload, "title");
        String message = firstNonBlank(textOrNull(payload, "message"), textOrNull(payload, "body"));
        String category = textOrNull(payload, "category");
        String priority = textOrNull(payload, "priority");
        String channel = textOrNull(payload, "channel");
        String targetRole = textOrNull(payload, "targetRole");
        Instant timestamp = parseInstant(payload, "timestamp", "createdAt");

        log.debug("Received notification event: eventId={}, eventType={}, sourceService={}, recipientId={}",
                eventId, eventType, sourceService, recipientId);

        if (eventVersion != null && !SUPPORTED_VERSIONS.contains(eventVersion)) {
            log.warn("Rejecting notification event with unsupported eventVersion={}: eventId={}", eventVersion, eventId);
            return;
        }

        if (eventId == null || eventType == null || recipientId == null || title == null || message == null || sourceService == null) {
            log.warn("Rejecting malformed notification event missing mandatory fields: eventId={}, eventType={}, hasRecipient={}, sourceService={}",
                    eventId, eventType, recipientId != null, sourceService);
            return;
        }

        Map<String, Object> metadata = null;
        if (payload.has("metadata") && payload.get("metadata").isObject()) {
            try {
                metadata = objectMapper.convertValue(payload.get("metadata"), new TypeReference<>() {});
            } catch (Exception ex) {
                log.warn("Ignoring invalid metadata in notification eventId={}: {}", eventId, ex.getMessage());
            }
        }

        NotificationEventPayload eventPayload = new NotificationEventPayload(
                eventId,
                eventType,
                eventVersion != null ? eventVersion : "1.0",
                recipientId,
                sourceService,
                aggregateId,
                aggregateType,
                title,
                message,
                category,
                priority,
                timestamp,
                metadata,
                channel,
                targetRole
        );

        try {
            notificationService.recordCentralizedEvent(eventPayload);
        } catch (Exception ex) {
            log.error("Transient failure persisting notification eventId={}, recipientId={}: {}",
                    eventId, recipientId, ex.getMessage(), ex);
            throw new IllegalStateException("Failed to persist notification event " + eventId, ex);
        }
    }

    private String textOrNull(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) return null;
        String val = node.get(field).asText();
        return val != null && !val.isBlank() ? val.trim() : null;
    }

    private String firstNonBlank(String primary, String fallback) {
        return primary != null && !primary.isBlank() ? primary : fallback;
    }

    private Instant parseInstant(JsonNode node, String primaryField, String fallbackField) {
        JsonNode valueNode = (node != null && node.hasNonNull(primaryField)) ? node.get(primaryField)
                : (node != null && node.hasNonNull(fallbackField) ? node.get(fallbackField) : null);
        if (valueNode == null) {
            return Instant.now();
        }
        if (valueNode.isNumber()) {
            double val = valueNode.asDouble();
            long seconds = (long) val;
            long nanos = (long) ((val - seconds) * 1_000_000_000L);
            return Instant.ofEpochSecond(seconds, nanos);
        }
        try {
            return Instant.parse(valueNode.asText().trim());
        } catch (Exception e) {
            return Instant.now();
        }
    }
}
