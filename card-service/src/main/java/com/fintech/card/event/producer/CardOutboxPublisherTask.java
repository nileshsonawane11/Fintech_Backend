package com.fintech.card.event.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.card.entity.CardOutboxEvent;
import com.fintech.card.repository.CardOutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
public class CardOutboxPublisherTask {

    private static final Logger log = LoggerFactory.getLogger(CardOutboxPublisherTask.class);
    private static final int MAX_RETRIES = 5;

    private final CardOutboxEventRepository outboxEventRepository;
    private final KafkaEventProducer kafkaEventProducer;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.card-application-events:card.application-events.v1}")
    private String applicationEventsTopic;

    @Value("${app.kafka.topics.card-events:card.events.v1}")
    private String lifecycleEventsTopic;

    @Value("${app.kafka.topics.notification-events:notification.events.v1}")
    private String notificationEventsTopic;

    public CardOutboxPublisherTask(CardOutboxEventRepository outboxEventRepository,
                                   KafkaEventProducer kafkaEventProducer,
                                   ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaEventProducer = kafkaEventProducer;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval-ms:3000}")
    @Transactional
    public void publishPendingEvents() {
        List<CardOutboxEvent> pendingEvents = outboxEventRepository
                .findByPublishingStatusAndRetryCountLessThanOrderByCreatedAtAsc(
                        "PENDING", MAX_RETRIES, PageRequest.of(0, 50));

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.debug("Processing {} pending card outbox events", pendingEvents.size());

        for (CardOutboxEvent event : pendingEvents) {
            String topic = resolveTopic(event.getEventType());
            try {
                Map<?, ?> payloadMap = objectMapper.readValue(event.getPayload(), Map.class);
                kafkaEventProducer.send(topic, event.getAggregateId(), payloadMap).get();

                event.setPublishingStatus("PUBLISHED");
                event.setPublishedAt(LocalDateTime.now());
                outboxEventRepository.save(event);
                log.info("Card outbox event published successfully: eventId={}, aggregateId={}",
                        event.getEventId(), event.getAggregateId());
            } catch (Exception ex) {
                log.warn("Failed to publish card outbox event eventId={}: {}", event.getEventId(), ex.getMessage());
                int retries = event.getRetryCount() + 1;
                event.setRetryCount(retries);
                if (retries >= MAX_RETRIES) {
                    event.setPublishingStatus("FAILED");
                    log.error("Card outbox event eventId={} marked as FAILED after {} retries", event.getEventId(), retries);
                }
                outboxEventRepository.save(event);
            }
        }
    }

    private String resolveTopic(String eventType) {
        if (eventType != null && eventType.startsWith("NOTIFICATION")) {
            return notificationEventsTopic;
        }
        if (eventType != null && eventType.startsWith("CARD_APPLICATION")) {
            return applicationEventsTopic;
        }
        return lifecycleEventsTopic;
    }
}
