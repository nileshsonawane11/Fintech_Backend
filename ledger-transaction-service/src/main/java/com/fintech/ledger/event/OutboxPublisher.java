package com.fintech.ledger.event;

import com.fintech.ledger.entity.OutboxEvent;
import com.fintech.ledger.enums.PublishingStatus;
import com.fintech.ledger.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.transaction-events:ledger.transaction-events.v1}")
    private String transactionEventsTopic;

    @Value("${app.kafka.topics.posting-events:ledger.posting-events.v1}")
    private String postingEventsTopic;

    @Value("${app.kafka.topics.balance-events:ledger.balance-events.v1}")
    private String balanceEventsTopic;

    @Value("${app.kafka.topics.hold-events:ledger.hold-events.v1}")
    private String holdEventsTopic;

    @Value("${app.kafka.topics.reconciliation-events:ledger.reconciliation-events.v1}")
    private String reconciliationEventsTopic;

    public OutboxPublisher(OutboxEventRepository outboxEventRepository,
                           KafkaTemplate<String, Object> kafkaTemplate) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxEventRepository.findTop50ByPublishingStatusOrderByCreatedAtAsc(PublishingStatus.PENDING);
        if (pending.isEmpty()) {
            return;
        }

        log.debug("Processing {} pending outbox events", pending.size());
        for (OutboxEvent event : pending) {
            String topic = resolveTopic(event.getEventType());
            try {
                kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload()).get();
                event.setPublishingStatus(PublishingStatus.PUBLISHED);
                event.setPublishedAt(Instant.now());
                log.info("Published outbox event {} to {}", event.getEventId(), topic);
            } catch (Exception ex) {
                log.warn("Failed to publish outbox event {} to topic {}: {}", event.getEventId(), topic, ex.getMessage());
                event.setRetryCount(event.getRetryCount() + 1);
                if (event.getRetryCount() >= 5) {
                    event.setPublishingStatus(PublishingStatus.FAILED);
                }
            }
            outboxEventRepository.save(event);
        }
    }

    private String resolveTopic(String eventType) {
        if (eventType == null) {
            return transactionEventsTopic;
        }
        if (eventType.startsWith("TRANSACTION_")) {
            return transactionEventsTopic;
        }
        if (eventType.startsWith("POSTING_") || eventType.equals("LEDGER_ACCOUNT_CREATED")) {
            return postingEventsTopic;
        }
        if (eventType.startsWith("BALANCE_")) {
            return balanceEventsTopic;
        }
        if (eventType.startsWith("HOLD_")) {
            return holdEventsTopic;
        }
        if (eventType.startsWith("RECONCILIATION_")) {
            return reconciliationEventsTopic;
        }
        return transactionEventsTopic;
    }
}
