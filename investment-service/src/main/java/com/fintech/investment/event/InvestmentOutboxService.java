package com.fintech.investment.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.entity.InvestmentEnums.OutboxStatus;
import com.fintech.investment.entity.InvestmentOutboxEvent;
import com.fintech.investment.repository.InvestmentOutboxEventRepository;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class InvestmentOutboxService {

    private final InvestmentOutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public InvestmentOutboxService(InvestmentOutboxEventRepository outboxRepository, ObjectMapper objectMapper) {
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueueNotification(
            String identitySubject,
            String eventType,
            String aggregateId,
            String title,
            String message,
            String category,
            String priority,
            String targetRole,
            Map<String, Object> metadata
    ) {
        String eventId = "INV-EVT-" + UUID.randomUUID();
        String correlationId = resolveCorrelationId();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventId", eventId);
        payload.put("eventType", eventType);
        payload.put("eventVersion", InvestmentConstants.EVENT_VERSION_1);
        payload.put("recipientId", identitySubject);
        payload.put("sourceService", "investment-service");
        payload.put("aggregateId", aggregateId);
        payload.put("aggregateType", "INVESTMENT");
        payload.put("title", title);
        payload.put("message", message);
        payload.put("category", category != null ? category : "INVESTMENT");
        payload.put("priority", priority != null ? priority : "NORMAL");
        payload.put("timestamp", Instant.now().toString());
        payload.put("channel", "IN_APP");
        payload.put("targetRole", targetRole != null ? targetRole : "CUSTOMER");
        payload.put("correlationId", correlationId);
        payload.put("metadata", metadata != null ? metadata : Map.of());

        saveOutbox(eventId, aggregateId, "INVESTMENT", InvestmentConstants.TOPIC_NOTIFICATION_EVENTS,
                eventType, correlationId, payload);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueueLifecycleEvent(
            String identitySubject,
            String eventType,
            String aggregateId,
            Map<String, Object> data
    ) {
        String eventId = "INV-LC-" + UUID.randomUUID();
        String correlationId = resolveCorrelationId();

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("eventVersion", InvestmentConstants.EVENT_VERSION_1);
        envelope.put("occurredAt", Instant.now().toString());
        envelope.put("correlationId", correlationId);
        envelope.put("identity_subject", identitySubject);
        envelope.put("aggregateId", aggregateId);
        envelope.put("payload", data != null ? data : Map.of());

        saveOutbox(eventId, aggregateId, "INVESTMENT", InvestmentConstants.TOPIC_INVESTMENT_LIFECYCLE,
                eventType, correlationId, envelope);
    }

    private void saveOutbox(String eventId, String aggregateId, String aggregateType,
                            String topic, String eventType, String correlationId, Object body) {
        InvestmentOutboxEvent event = new InvestmentOutboxEvent();
        event.setEventId(eventId);
        event.setAggregateId(aggregateId);
        event.setAggregateType(aggregateType);
        event.setTopic(topic);
        event.setEventType(eventType);
        event.setEventVersion(InvestmentConstants.EVENT_VERSION_1);
        event.setCorrelationId(correlationId);
        event.setStatus(OutboxStatus.PENDING);
        try {
            event.setPayload(objectMapper.writeValueAsString(body));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize outbox event", e);
        }
        outboxRepository.save(event);
    }

    private String resolveCorrelationId() {
        String cid = MDC.get(InvestmentConstants.MDC_CORRELATION_ID);
        return (cid != null && !cid.isBlank()) ? cid : UUID.randomUUID().toString();
    }
}
