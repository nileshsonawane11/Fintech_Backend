package com.fintech.customer.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic customerRegisteredTopic(
            @Value("${app.kafka.topics.customer-registered}")
            String topicName) {

        return TopicBuilder.name(topicName)
                .partitions(3)
                .replicas(1)
                .build();
    }
}