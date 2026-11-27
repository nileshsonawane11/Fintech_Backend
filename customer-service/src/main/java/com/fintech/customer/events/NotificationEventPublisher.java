package com.fintech.customer.events;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

@Component
public class NotificationEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventPublisher.class);

    private final KafkaTemplate<String, NotificationEvent> kafkaTemplate;
    private final String notificationTopic;

    public NotificationEventPublisher(
            KafkaTemplate<String, NotificationEvent> notificationKafkaTemplate,
            @Value("${app.kafka.topics.notification-events:notification.events.v1}") String notificationTopic) {
        this.kafkaTemplate = notificationKafkaTemplate;
        this.notificationTopic = notificationTopic;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void publish(NotificationEvent event) {
        if (event == null || event.recipientId() == null || event.recipientId().isBlank()) {
            log.warn("Skipping customer notification event without valid recipientId: eventType={}",
                    event != null ? event.eventType() : "null");
            return;
        }

        String correlationId = MDC.get("correlationId");
        ProducerRecord<String, NotificationEvent> record =
                new ProducerRecord<>(notificationTopic, event.recipientId(), event);
        record.headers().add("X-Event-Id", event.eventId().getBytes(StandardCharsets.UTF_8));
        record.headers().add("X-Event-Type", event.eventType().getBytes(StandardCharsets.UTF_8));
        if (correlationId != null && !correlationId.isBlank()) {
            record.headers().add("X-Correlation-Id", correlationId.getBytes(StandardCharsets.UTF_8));
        }

        CompletableFuture.runAsync(() -> {
            try {
                kafkaTemplate.send(record).whenComplete((result, exception) -> {
                    if (exception != null) {
                        log.error("Failed to publish customer notification event: eventId={}, eventType={}, correlationId={}, topic={}, reason={}",
                                event.eventId(), event.eventType(), correlationId, notificationTopic, exception.getMessage());
                        return;
                    }
                    log.info("Published customer notification event: eventId={}, eventType={}, topic={}, partition={}, offset={}",
                            event.eventId(), event.eventType(),
                            result.getRecordMetadata().topic(),
                            result.getRecordMetadata().partition(),
                            result.getRecordMetadata().offset());
                });
            } catch (Exception ex) {
                log.error("Failed to dispatch customer notification event: eventId={}, eventType={}, correlationId={}, reason={}",
                        event.eventId(), event.eventType(), correlationId, ex.getMessage());
            }
        });
    }
}
