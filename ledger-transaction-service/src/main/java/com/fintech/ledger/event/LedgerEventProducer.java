package com.fintech.ledger.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.ledger.entity.OutboxEvent;
import com.fintech.ledger.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class LedgerEventProducer {

    private static final Logger log = LoggerFactory.getLogger(LedgerEventProducer.class);

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public LedgerEventProducer(OutboxEventRepository outboxEventRepository,
                               KafkaTemplate<String, Object> kafkaTemplate,
                               ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public <T> OutboxEvent enqueueEvent(String aggregateId, String aggregateType, String eventType, String correlationId, T payload) {
        try {
            DomainEvent<T> domainEvent = DomainEvent.of(eventType, aggregateId, aggregateType, correlationId, payload);
            String payloadJson = objectMapper.writeValueAsString(domainEvent);

            OutboxEvent outboxEvent = new OutboxEvent(
                    domainEvent.eventId(),
                    aggregateId,
                    aggregateType,
                    eventType,
                    payloadJson
            );

            log.info("Enqueued outbox event: type={}, aggregateId={}", eventType, aggregateId);
            return outboxEventRepository.save(outboxEvent);
        } catch (Exception ex) {
            log.error("Failed to serialize and enqueue outbox event {}: {}", eventType, ex.getMessage(), ex);
            throw new RuntimeException("Event serialization error", ex);
        }
    }

    public void publishDirect(String topic, String key, Object payload) {
        try {
            kafkaTemplate.send(topic, key, payload);
            log.info("Directly published event to topic {}: key={}", topic, key);
        } catch (Exception ex) {
            log.warn("Direct publication to Kafka failed (will be handled by outbox if transactional): {}", ex.getMessage());
        }
    }
}
