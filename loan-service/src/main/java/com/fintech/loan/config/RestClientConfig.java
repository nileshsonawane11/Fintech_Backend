package com.fintech.loan.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class RestClientConfig {

    private SimpleClientHttpRequestFactory createRequestFactory(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        return factory;
    }

    @Bean
    @Primary
    public RestClient.Builder restClientBuilder(
            @Value("${app.services.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${app.services.read-timeout-ms:5000}") int readTimeoutMs) {
        return RestClient.builder()
                .requestFactory(createRequestFactory(connectTimeoutMs, readTimeoutMs));
    }

    @Bean
    @LoadBalanced
    public RestClient.Builder loadBalancedRestClientBuilder(
            @Value("${app.services.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${app.services.read-timeout-ms:5000}") int readTimeoutMs) {
        return RestClient.builder()
                .requestFactory(createRequestFactory(connectTimeoutMs, readTimeoutMs));
    }
}
