
package com.fintech.customer.events;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.customer.service.CustomerProvisioningService;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class CustomerRegisteredEventConsumer {

    private static final Logger log =
            LoggerFactory.getLogger(CustomerRegisteredEventConsumer.class);

    private final CustomerProvisioningService customerProvisioningService;
    private final ObjectMapper objectMapper;

    public CustomerRegisteredEventConsumer(
            CustomerProvisioningService customerProvisioningService,
            ObjectMapper objectMapper) {

        this.customerProvisioningService = customerProvisioningService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.customer-registered}"
    )
    public void consume(ConsumerRecord<String, String> record) {

        try {
            String message = record.value();

            log.info(
                    "KAFKA MESSAGE RECEIVED: topic={}, partition={}, offset={}, key={}, payload={}",
                    record.topic(),
                    record.partition(),
                    record.offset(),
                    record.key(),
                    message
            );

            if (message == null || message.isBlank()) {
                log.warn("Received empty customer registration event");
                return;
            }

            Map<String, Object> payload = objectMapper.readValue(
                    message,
                    new TypeReference<Map<String, Object>>() {}
            );

            customerProvisioningService.createProfileIfAbsent(payload);

        } catch (Exception exception) {
            log.error(
                    "Failed to process customer registration event. Topic={}, Offset={}",
                    record.topic(),
                    record.offset(),
                    exception
            );

            throw new RuntimeException(
                    "Customer registration event processing failed",
                    exception
            );
        }
    }
}