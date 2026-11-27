package com.fintech.payment.config;

import com.fintech.payment.constants.PaymentConstants;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class PaymentKafkaConfig {

    @Bean
    public NewTopic incomingEventsTopic() {
        return TopicBuilder.name(PaymentConstants.TOPIC_INCOMING_EVENTS).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic reconciliationEventsTopic() {
        return TopicBuilder.name(PaymentConstants.TOPIC_RECONCILIATION_EVENTS).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic ledgerTransactionEventsDlqTopic() {
        return TopicBuilder.name(PaymentConstants.TOPIC_LEDGER_TRANSACTION_EVENTS + ".dlq").partitions(1).replicas(1).build();
    }

    @Bean
    public DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> stringKafkaTemplate) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                stringKafkaTemplate,
                (record, ex) -> new TopicPartition(record.topic() + ".dlq", 0)
        );
        return new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3L));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory,
            DefaultErrorHandler kafkaErrorHandler) {
        ConcurrentKafkaListenerContainerFactory<String, String> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.RECORD);
        factory.setCommonErrorHandler(kafkaErrorHandler);
        return factory;
    }
}
