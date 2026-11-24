package com.fintech.card.event.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.card.entity.CardOutboxEvent;
import com.fintech.card.event.model.DomainEvent;
import com.fintech.card.repository.CardOutboxEventRepository;
import com.fintech.card.util.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CardOutboxEventService {

    private static final Logger log = LoggerFactory.getLogger(CardOutboxEventService.class);

    private final CardOutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public CardOutboxEventService(CardOutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public <T> CardOutboxEvent enqueueEvent(String aggregateId, String aggregateType, String eventType, T payload) {
        try {
            String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString();
            }

            DomainEvent<T> envelope = DomainEvent.of(eventType, aggregateId, aggregateType, correlationId, payload);
            String jsonPayload = objectMapper.writeValueAsString(envelope);

            CardOutboxEvent outboxEvent = new CardOutboxEvent(
                    envelope.eventId(),
                    aggregateId,
                    aggregateType,
                    eventType,
                    jsonPayload
            );

            log.debug("Enqueued card outbox event: eventId={}, eventType={}, aggregateId={}",
                    outboxEvent.getEventId(), eventType, aggregateId);

            return outboxEventRepository.save(outboxEvent);
        } catch (Exception e) {
            log.error("Failed to enqueue card outbox event for aggregate {}: {}", aggregateId, e.getMessage(), e);
            throw new IllegalStateException("Failed to serialize and save card outbox event", e);
        }
    }
}
