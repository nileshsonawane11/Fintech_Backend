package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.entity.PaymentOutboxEvent;
import com.fintech.payment.event.model.PaymentEventEnvelope;
import com.fintech.payment.repository.PaymentOutboxEventRepository;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentOutboxService {

    private final PaymentOutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public PaymentOutboxService(PaymentOutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public <T> void enqueueEvent(
            String topic,
            String aggregateId,
            String aggregateType,
            String eventType,
            String customerReference,
            String providerReference,
            T payload) {
        String eventId = UUID.randomUUID().toString();
        String correlationId = MDC.get(PaymentConstants.MDC_CORRELATION_ID);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        Instant now = Instant.now();

        PaymentEventEnvelope<T> envelope = new PaymentEventEnvelope<>(
                eventId,
                eventType,
                PaymentConstants.EVENT_SCHEMA_VERSION,
                now,
                correlationId,
                aggregateId,
                aggregateType,
                customerReference,
                providerReference,
                payload
        );

        String serialized;
        try {
            serialized = objectMapper.writeValueAsString(envelope);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize payment domain event " + eventType, ex);
        }

        PaymentOutboxEvent outbox = new PaymentOutboxEvent();
        outbox.setEventId(eventId);
        outbox.setAggregateId(aggregateId);
        outbox.setAggregateType(aggregateType);
        outbox.setEventType(eventType);
        outbox.setTopic(topic);
        outbox.setPayload(serialized);
        outbox.setCorrelationId(correlationId);
        outbox.setPublishingStatus("PENDING");
        outbox.setRetryCount(0);
        outbox.setNextAttemptAt(now);
        outboxEventRepository.save(outbox);
    }
}
