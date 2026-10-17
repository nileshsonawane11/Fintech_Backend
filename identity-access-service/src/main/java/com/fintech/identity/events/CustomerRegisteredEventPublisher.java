package com.fintech.identity.events;

import com.fintech.events.CustomerRegisteredEvent;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class CustomerRegisteredEventPublisher {

    private static final Logger log =
            LoggerFactory.getLogger(CustomerRegisteredEventPublisher.class);

    private static final String TOPIC =
            "identity.customer-events.v1";

    private final KafkaTemplate<String, CustomerRegisteredEvent> kafkaTemplate;

    public CustomerRegisteredEventPublisher(
            KafkaTemplate<String, CustomerRegisteredEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(CustomerRegisteredEvent event) {
        String key = event.identityId().toString();

        log.info(
                "Sending customer registration event to Kafka: topic={}, identityId={}",
                TOPIC, key
        );

        ProducerRecord<String, CustomerRegisteredEvent> record =
                new ProducerRecord<>(TOPIC, key, event);

        kafkaTemplate.send(record).whenComplete((result, exception) -> {
            if (exception != null) {
                log.error(
                        "Kafka publish failed: topic={}, identityId={}",
                        TOPIC, key, exception
                );
                return;
            }

            log.info(
                    "Kafka publish successful: topic={}, partition={}, offset={}, identityId={}",
                    result.getRecordMetadata().topic(),
                    result.getRecordMetadata().partition(),
                    result.getRecordMetadata().offset(),
                    key
            );
        });
    }
}