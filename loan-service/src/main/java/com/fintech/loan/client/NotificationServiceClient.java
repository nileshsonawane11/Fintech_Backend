package com.fintech.loan.client;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.event.model.LoanEvents;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class NotificationServiceClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceClient.class);

    private final RestClient restClient;

    public NotificationServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.notification-service.service-id:" + LoanConstants.SERVICE_NOTIFICATION + "}")
            String serviceId) {
        String baseUrl = (serviceId.startsWith("http://") || serviceId.startsWith("https://"))
                ? serviceId
                : "http://" + serviceId;
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
    }

    public boolean sendNotification(LoanEvents.LoanNotificationPayload payload) {
        String correlationId = MDC.get(LoanConstants.MDC_CORRELATION_ID);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        try {
            restClient.post()
                    .uri(LoanConstants.PATH_INTERNAL_NOTIFICATIONS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(LoanConstants.HEADER_CORRELATION_ID, correlationId)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.warn("Direct HTTP notification delivery to Notification Service failed (Kafka outbox remains active): {}",
                    ex.getMessage());
            return false;
        }
    }
}
