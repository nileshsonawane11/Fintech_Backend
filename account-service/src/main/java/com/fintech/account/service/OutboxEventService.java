package com.fintech.account.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.account.entity.OutboxEvent;
import com.fintech.account.event.model.DomainEvent;
import com.fintech.account.repository.OutboxEventRepository;
import com.fintech.account.util.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class OutboxEventService {

    private static final Logger log = LoggerFactory.getLogger(OutboxEventService.class);

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public OutboxEventService(OutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public <T> OutboxEvent enqueueEvent(String aggregateId, String aggregateType, String eventType, T payload) {
        try {
            String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString();
            }

            DomainEvent<T> envelope = DomainEvent.of(eventType, aggregateId, aggregateType, correlationId, payload);
            String jsonPayload = objectMapper.writeValueAsString(envelope);

            OutboxEvent outboxEvent = new OutboxEvent(
                    envelope.eventId(),
                    aggregateId,
                    aggregateType,
                    eventType,
                    jsonPayload
            );

            log.debug("Enqueued outbox event: id={}, type={}, aggregateId={}",
                    outboxEvent.getEventId(), eventType, aggregateId);

            return outboxEventRepository.save(outboxEvent);
        } catch (Exception e) {
            log.error("Failed to enqueue outbox event for aggregate {}: {}", aggregateId, e.getMessage(), e);
            throw new IllegalStateException("Failed to serialize and save outbox event", e);
        }
    }
}
