package com.fintech.payment.event.producer;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.entity.PaymentOutboxEvent;
import com.fintech.payment.repository.PaymentOutboxEventRepository;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

@Component
public class PaymentOutboxPublisherTask {

    private static final Logger log = LoggerFactory.getLogger(PaymentOutboxPublisherTask.class);

    private final PaymentOutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final int maxRetries;
    private final int batchSize;

    public PaymentOutboxPublisherTask(
            PaymentOutboxEventRepository outboxRepository,
            KafkaTemplate<String, String> kafkaTemplate,
            @Value("${payment.outbox.max-retries:" + PaymentConstants.DEFAULT_OUTBOX_MAX_RETRIES + "}") int maxRetries,
            @Value("${payment.outbox.batch-size:" + PaymentConstants.DEFAULT_OUTBOX_BATCH_SIZE + "}") int batchSize) {
        this.outboxRepository = outboxRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.maxRetries = maxRetries;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${payment.outbox.poll-interval-ms:3000}")
    @Transactional
    public void publishPendingEvents() {
        List<PaymentOutboxEvent> due = outboxRepository.findDuePendingEvents(
                Instant.now(), maxRetries, PageRequest.of(0, batchSize));

        for (PaymentOutboxEvent event : due) {
            try {
                ProducerRecord<String, String> record = new ProducerRecord<>(
                        event.getTopic(), event.getAggregateId(), event.getPayload());
                record.headers().add("X-Event-Id", event.getEventId().getBytes(StandardCharsets.UTF_8));
                record.headers().add("X-Event-Type", event.getEventType().getBytes(StandardCharsets.UTF_8));
                if (event.getCorrelationId() != null) {
                    record.headers().add(PaymentConstants.HEADER_CORRELATION_ID,
                            event.getCorrelationId().getBytes(StandardCharsets.UTF_8));
                }
                kafkaTemplate.send(record).get();
                event.setPublishingStatus("PUBLISHED");
                event.setPublishedAt(Instant.now());
                event.setLastError(null);
            } catch (Exception ex) {
                int nextRetry = event.getRetryCount() + 1;
                event.setRetryCount(nextRetry);
                event.setLastError(ex.getMessage() != null && ex.getMessage().length() > 490
                        ? ex.getMessage().substring(0, 490) : ex.getMessage());
                if (nextRetry >= maxRetries) {
                    event.setPublishingStatus("FAILED");
                    log.error("Outbox event {} exhausted retries for topic {}: {}",
                            event.getEventId(), event.getTopic(), ex.getMessage());
                } else {
                    long delaySeconds = (long) Math.pow(2, nextRetry) * 5L;
                    event.setNextAttemptAt(Instant.now().plusSeconds(delaySeconds));
                }
            }
            outboxRepository.save(event);
        }
    }
}
