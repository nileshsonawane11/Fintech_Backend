package com.fintech.loan.config;

import com.fintech.loan.constants.LoanConstants;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id:" + LoanConstants.CONSUMER_GROUP_LOAN + "}")
    private String consumerGroupId;

    @Bean
    public ConsumerFactory<String, String> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, consumerGroupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ProducerFactory<String, String> stringProducerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, String> kafkaTemplate(ProducerFactory<String, String> stringProducerFactory) {
        return new KafkaTemplate<>(stringProducerFactory);
    }

    @Bean
    public DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> kafkaTemplate) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
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

    @Bean public NewTopic applicationSubmittedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_APPLICATION_SUBMITTED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic applicationStatusChangedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_APPLICATION_STATUS_CHANGED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic applicationApprovedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_APPLICATION_APPROVED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic applicationRejectedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_APPLICATION_REJECTED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic applicationDisbursedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_APPLICATION_DISBURSED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic offerCreatedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_OFFER_CREATED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic offerUpdatedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_OFFER_UPDATED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic offerActivatedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_OFFER_ACTIVATED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic offerDeactivatedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_OFFER_DEACTIVATED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic productCreatedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_PRODUCT_CREATED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic productUpdatedTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_PRODUCT_UPDATED).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic notificationEventsTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_NOTIFICATION_EVENTS).partitions(3).replicas(1).build();
    }

    @Bean public NewTopic accountLifecycleDlqTopic() {
        return TopicBuilder.name(LoanConstants.TOPIC_ACCOUNT_LIFECYCLE + ".dlq").partitions(1).replicas(1).build();
    }
}
