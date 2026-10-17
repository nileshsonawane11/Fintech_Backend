package com.fintech.customer.events;

import com.fintech.customer.service.CustomerProvisioningService;
import com.fintech.events.CustomerRegisteredEvent;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class CustomerRegisteredEventConsumer {

    private final CustomerProvisioningService customerProvisioningService;

    private static final Logger log =
            LoggerFactory.getLogger(CustomerRegisteredEventConsumer.class);

    public CustomerRegisteredEventConsumer(CustomerProvisioningService customerProvisioningService) {
        this.customerProvisioningService = customerProvisioningService;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.customer-registered}"
    )
    public void consume(ConsumerRecord<String, CustomerRegisteredEvent> record) {
        log.info(
                "KAFKA MESSAGE RECEIVED: topic={}, partition={}, offset={}, key={}, payload={}",
                record.topic(),
                record.partition(),
                record.offset(),
                record.key(),
                record.value()
        );

        customerProvisioningService.createProfileIfAbsent(record.key());
    }
}