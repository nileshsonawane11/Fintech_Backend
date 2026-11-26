package com.fintech.loan.event.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.entity.OutboxEvent;
import com.fintech.loan.enums.PublishingStatus;
import com.fintech.loan.event.model.DomainEvent;
import com.fintech.loan.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class LoanOutboxService {

    private static final Logger log = LoggerFactory.getLogger(LoanOutboxService.class);

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public LoanOutboxService(OutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public <T> OutboxEvent enqueueEvent(String topic, String aggregateId, String aggregateType,
                                        String eventType, T payload) {
        String correlationId = MDC.get(LoanConstants.MDC_CORRELATION_ID);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        DomainEvent<T> envelope = DomainEvent.of(eventType, aggregateId, aggregateType, correlationId, payload);
        String serialized;
        try {
            serialized = objectMapper.writeValueAsString(envelope);
        } catch (Exception ex) {
            log.error("Failed to serialize loan domain event {}: {}", eventType, ex.getMessage(), ex);
            throw new IllegalStateException("Failed to serialize loan domain event: " + eventType, ex);
        }

        OutboxEvent outbox = new OutboxEvent();
        outbox.setId(UUID.randomUUID());
        outbox.setEventId(envelope.eventId());
        outbox.setTopic(topic);
        outbox.setAggregateId(aggregateId);
        outbox.setAggregateType(aggregateType);
        outbox.setEventType(eventType);
        outbox.setPayload(serialized);
        outbox.setCorrelationId(correlationId);
        outbox.setPublishingStatus(PublishingStatus.PENDING);
        outbox.setRetryCount(0);
        outbox.setNextAttemptAt(Instant.now());

        log.debug("Enqueued loan outbox event: topic={}, eventType={}, aggregateId={}",
                topic, eventType, aggregateId);
        return outboxEventRepository.save(outbox);
    }
}
