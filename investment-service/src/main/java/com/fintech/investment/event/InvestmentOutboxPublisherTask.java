package com.fintech.investment.event;

import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.entity.InvestmentEnums.OutboxStatus;
import com.fintech.investment.entity.InvestmentOutboxEvent;
import com.fintech.investment.repository.InvestmentOutboxEventRepository;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = true)
public class InvestmentOutboxPublisherTask {

    private static final Logger log = LoggerFactory.getLogger(InvestmentOutboxPublisherTask.class);

    private final InvestmentOutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final int batchSize;
    private final int maxRetries;
    private final boolean kafkaEnabled;

    public InvestmentOutboxPublisherTask(
            InvestmentOutboxEventRepository outboxRepository,
            KafkaTemplate<String, String> kafkaTemplate,
            @Value("${app.outbox.batch-size:50}") int batchSize,
            @Value("${app.outbox.max-retries:5}") int maxRetries,
            @Value("${app.kafka.enabled:true}") boolean kafkaEnabled) {
        this.outboxRepository = outboxRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.batchSize = batchSize;
        this.maxRetries = maxRetries;
        this.kafkaEnabled = kafkaEnabled;
    }

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval-ms:3000}")
    public void publishPendingEvents() {
        if (!kafkaEnabled) {
            return;
        }
        List<InvestmentOutboxEvent> due = outboxRepository.findDueEvents(Instant.now(), PageRequest.of(0, batchSize));
        if (due.isEmpty()) {
            return;
        }
        for (InvestmentOutboxEvent event : due) {
            try {
                ProducerRecord<String, String> record = new ProducerRecord<>(
                        event.getTopic(), event.getAggregateId(), event.getPayload());
                record.headers().add(InvestmentConstants.HEADER_EVENT_ID,
                        event.getEventId().getBytes(StandardCharsets.UTF_8));
                record.headers().add(InvestmentConstants.HEADER_EVENT_TYPE,
                        event.getEventType().getBytes(StandardCharsets.UTF_8));
                if (event.getCorrelationId() != null) {
                    record.headers().add(InvestmentConstants.HEADER_CORRELATION_ID,
                            event.getCorrelationId().getBytes(StandardCharsets.UTF_8));
                }
                kafkaTemplate.send(record).get(3, TimeUnit.SECONDS);
                event.setStatus(OutboxStatus.PUBLISHED);
                event.setPublishedAt(Instant.now());
                event.setLastError(null);
            } catch (Exception ex) {
                int retries = event.getRetryCount() + 1;
                event.setRetryCount(retries);
                event.setLastError(ex.getMessage() != null && ex.getMessage().length() > 450
                        ? ex.getMessage().substring(0, 450)
                        : ex.getMessage());
                if (retries >= maxRetries) {
                    event.setStatus(OutboxStatus.FAILED);
                    log.error("Outbox event {} permanently failed after {} retries", event.getEventId(), retries);
                } else {
                    long backoffSeconds = (long) Math.pow(2, retries) * 5L;
                    event.setNextRetryAt(Instant.now().plusSeconds(backoffSeconds));
                }
            }
        }
        outboxRepository.saveAll(due);
    }
}
