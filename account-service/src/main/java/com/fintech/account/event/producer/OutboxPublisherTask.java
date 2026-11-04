package com.fintech.account.event.producer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.account.entity.OutboxEvent;
import com.fintech.account.enums.PublishingStatus;
import com.fintech.account.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class OutboxPublisherTask {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisherTask.class);
    private static final int MAX_RETRIES = 5;

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaEventProducer kafkaEventProducer;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.application-events:account.application-events.v1}")
    private String applicationEventsTopic;

    @Value("${app.kafka.topics.lifecycle-events:account.lifecycle-events.v1}")
    private String lifecycleEventsTopic;

    @Value("${app.kafka.topics.hold-events:account.hold-events.v1}")
    private String holdEventsTopic;

    @Value("${app.kafka.topics.nominee-events:account.nominee-events.v1}")
    private String nomineeEventsTopic;

    public OutboxPublisherTask(OutboxEventRepository outboxEventRepository,
                              KafkaEventProducer kafkaEventProducer,
                              ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaEventProducer = kafkaEventProducer;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval-ms:3000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pendingEvents = outboxEventRepository
                .findByPublishingStatusAndRetryCountLessThanOrderByCreatedAtAsc(
                        PublishingStatus.PENDING, MAX_RETRIES, PageRequest.of(0, 50));

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.debug("Processing {} pending outbox events", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            String topic = resolveTopic(event.getEventType());
            try {
                JsonNode payloadNode = objectMapper.readTree(event.getPayload());
                kafkaEventProducer.send(topic, event.getAggregateId(), payloadNode).get();

                event.setPublishingStatus(PublishingStatus.PUBLISHED);
                event.setPublishedAt(Instant.now());
                outboxEventRepository.save(event);
            } catch (Exception ex) {
                log.warn("Failed to publish outbox event id={}: {}", event.getEventId(), ex.getMessage());
                int retries = event.getRetryCount() + 1;
                event.setRetryCount(retries);
                if (retries >= MAX_RETRIES) {
                    event.setPublishingStatus(PublishingStatus.FAILED);
                    log.error("Outbox event id={} marked as FAILED after {} retries", event.getEventId(), retries);
                }
                outboxEventRepository.save(event);
            }
        }
    }

    private String resolveTopic(String eventType) {
        if (eventType == null) {
            return lifecycleEventsTopic;
        }
        if (eventType.startsWith("AccountApplication")) {
            return applicationEventsTopic;
        } else if (eventType.startsWith("AccountHold")) {
            return holdEventsTopic;
        } else if (eventType.startsWith("AccountNominee")) {
            return nomineeEventsTopic;
        } else {
            return lifecycleEventsTopic;
        }
    }
}
