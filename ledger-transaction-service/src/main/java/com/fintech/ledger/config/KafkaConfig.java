package com.fintech.ledger.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JacksonJsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${app.kafka.topics.transaction-events:ledger.transaction-events.v1}")
    private String transactionEventsTopic;

    @Value("${app.kafka.topics.posting-events:ledger.posting-events.v1}")
    private String postingEventsTopic;

    @Value("${app.kafka.topics.balance-events:ledger.balance-events.v1}")
    private String balanceEventsTopic;

    @Value("${app.kafka.topics.hold-events:ledger.hold-events.v1}")
    private String holdEventsTopic;

    @Value("${app.kafka.topics.reconciliation-events:ledger.reconciliation-events.v1}")
    private String reconciliationEventsTopic;

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> properties = new HashMap<>();
        properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JacksonJsonSerializer.class);
        properties.put(ProducerConfig.ACKS_CONFIG, "all");
        properties.put(ProducerConfig.RETRIES_CONFIG, 3);
        properties.put(JacksonJsonSerializer.ADD_TYPE_INFO_HEADERS, false);

        return new DefaultKafkaProducerFactory<>(properties);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate(ProducerFactory<String, Object> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    @Bean
    public NewTopic transactionEventsTopic() {
        return TopicBuilder.name(transactionEventsTopic).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic postingEventsTopic() {
        return TopicBuilder.name(postingEventsTopic).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic balanceEventsTopic() {
        return TopicBuilder.name(balanceEventsTopic).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic holdEventsTopic() {
        return TopicBuilder.name(holdEventsTopic).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic reconciliationEventsTopic() {
        return TopicBuilder.name(reconciliationEventsTopic).partitions(3).replicas(1).build();
    }
}
