
package com.fintech.account.config;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
public class RestClientConfig {

    private JdkClientHttpRequestFactory requestFactory() {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(2500))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofMillis(4000));
        return factory;
    }

    /**
     * Default HTTP client.
     * Used by infrastructure components such as Eureka
     * that must communicate with actual URLs.
     */
    @Bean
    @Primary
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder().requestFactory(requestFactory());
    }

    /**
     * Load-balanced HTTP client.
     * Used exclusively for inter-service communication
     * through Eureka Service Discovery.
     */
    @Bean
    @LoadBalanced
    public RestClient.Builder loadBalancedRestClientBuilder() {
        return RestClient.builder().requestFactory(requestFactory());
    }
}