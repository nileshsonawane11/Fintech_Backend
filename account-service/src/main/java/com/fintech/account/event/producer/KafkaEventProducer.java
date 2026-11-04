package com.fintech.account.event.producer;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
public class KafkaEventProducer {

    private static final Logger log = LoggerFactory.getLogger(KafkaEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public KafkaEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public CompletableFuture<Void> send(String topic, String key, Object message) {
        ProducerRecord<String, Object> record = new ProducerRecord<>(topic, key, message);
        log.info("Publishing event to Kafka: topic={}, key={}", topic, key);

        return kafkaTemplate.send(record)
                .thenAccept(result -> {
                    log.info("Successfully published event: topic={}, partition={}, offset={}, key={}",
                            result.getRecordMetadata().topic(),
                            result.getRecordMetadata().partition(),
                            result.getRecordMetadata().offset(),
                            key);
                })
                .exceptionally(ex -> {
                    log.error("Failed to publish event to Kafka: topic={}, key={}, error={}",
                            topic, key, ex.getMessage(), ex);
                    throw new RuntimeException("Kafka publish error: " + ex.getMessage(), ex);
                });
    }
}
