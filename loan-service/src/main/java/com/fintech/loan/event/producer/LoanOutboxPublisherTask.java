package com.fintech.loan.event.producer;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.entity.OutboxEvent;
import com.fintech.loan.enums.PublishingStatus;
import com.fintech.loan.repository.OutboxEventRepository;
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
public class LoanOutboxPublisherTask {

    private static final Logger log = LoggerFactory.getLogger(LoanOutboxPublisherTask.class);

    private final OutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final int maxRetries;
    private final int batchSize;

    public LoanOutboxPublisherTask(
            OutboxEventRepository outboxRepository,
            KafkaTemplate<String, String> kafkaTemplate,
            @Value("${app.outbox.max-retries:" + LoanConstants.DEFAULT_OUTBOX_MAX_RETRIES + "}") int maxRetries,
            @Value("${app.outbox.batch-size:" + LoanConstants.DEFAULT_OUTBOX_BATCH_SIZE + "}") int batchSize) {
        this.outboxRepository = outboxRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.maxRetries = maxRetries;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval-ms:3000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> due = outboxRepository.findDueEvents(
                PublishingStatus.PENDING, Instant.now(), maxRetries, PageRequest.of(0, batchSize));

        if (due.isEmpty()) {
            return;
        }

        for (OutboxEvent event : due) {
            try {
                ProducerRecord<String, String> record = new ProducerRecord<>(
                        event.getTopic(), event.getAggregateId(), event.getPayload());
                record.headers().add("X-Event-Id", event.getEventId().getBytes(StandardCharsets.UTF_8));
                record.headers().add("X-Event-Type", event.getEventType().getBytes(StandardCharsets.UTF_8));
                if (event.getCorrelationId() != null) {
                    record.headers().add(LoanConstants.HEADER_CORRELATION_ID,
                            event.getCorrelationId().getBytes(StandardCharsets.UTF_8));
                }

                kafkaTemplate.send(record).get();
                event.setPublishingStatus(PublishingStatus.PUBLISHED);
                event.setPublishedAt(Instant.now());
                event.setLastError(null);
                log.info("Published loan outbox event: eventId={}, topic={}, aggregateId={}",
                        event.getEventId(), event.getTopic(), event.getAggregateId());
            } catch (Exception ex) {
                int nextRetry = event.getRetryCount() + 1;
                event.setRetryCount(nextRetry);
                String errMsg = ex.getMessage() != null && ex.getMessage().length() > 490
                        ? ex.getMessage().substring(0, 490)
                        : ex.getMessage();
                event.setLastError(errMsg);
                if (nextRetry >= maxRetries) {
                    event.setPublishingStatus(PublishingStatus.FAILED);
                    log.error("Loan outbox event {} exhausted {} retries for topic {}: {}",
                            event.getEventId(), maxRetries, event.getTopic(), errMsg);
                } else {
                    long delaySeconds = (long) Math.pow(2, nextRetry) * 5L;
                    event.setNextAttemptAt(Instant.now().plusSeconds(delaySeconds));
                    log.warn("Failed to publish loan outbox event {} (attempt {}): {}",
                            event.getEventId(), nextRetry, errMsg);
                }
            }
            outboxRepository.save(event);
        }
    }
}
