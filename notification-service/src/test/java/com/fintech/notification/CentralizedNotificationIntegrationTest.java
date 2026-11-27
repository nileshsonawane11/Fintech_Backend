package com.fintech.notification;

import com.fintech.notification.entity.Notification;
import com.fintech.notification.event.NotificationEventKafkaConsumer;
import com.fintech.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:notif_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "eureka.client.enabled=false",
        "spring.cloud.discovery.enabled=false",
        "spring.kafka.listener.auto-startup=false"
})
class CentralizedNotificationIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @Autowired
    private NotificationEventKafkaConsumer consumer;

    @Autowired
    private NotificationRepository notificationRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        notificationRepository.deleteAll();
    }

    @Test
    void consumesFlatAndWrappedEventsIdempotentlyAndEnforcesOwnership() throws Exception {
        String flatEvent = """
                {
                  "eventId": "IDN-NOTIF-1001",
                  "eventType": "USER_REGISTERED",
                  "eventVersion": "1.0",
                  "recipientId": "user-sub-1",
                  "sourceService": "identity-access-service",
                  "aggregateId": "user-sub-1",
                  "aggregateType": "IDENTITY",
                  "title": "Welcome to FinBank",
                  "message": "Your FinBank account registration has been completed.",
                  "category": "SECURITY",
                  "priority": "NORMAL",
                  "timestamp": "2026-11-26T10:00:00Z",
                  "metadata": {"status": "ACTIVE"}
                }
                """;

        String wrappedEvent = """
                {
                  "eventId": "env-2001",
                  "eventType": "NotificationRequested",
                  "aggregateId": "user-sub-1",
                  "payload": {
                    "eventId": "ACC-NOTIF-2001",
                    "eventType": "ACCOUNT_OPENED",
                    "eventVersion": "1.0",
                    "recipientId": "user-sub-1",
                    "sourceService": "account-service",
                    "aggregateId": "ACC-123",
                    "aggregateType": "ACCOUNT",
                    "title": "Bank Account Opened",
                    "message": "Your SAVINGS account is now active.",
                    "category": "ACCOUNT",
                    "priority": "HIGH",
                    "timestamp": "2026-11-26T10:05:00Z"
                  }
                }
                """;

        String malformedMissingRecipient = """
                {
                  "eventId": "BAD-NOTIF-1",
                  "eventType": "ACCOUNT_OPENED",
                  "eventVersion": "1.0",
                  "sourceService": "account-service",
                  "title": "Bad",
                  "message": "Missing recipient"
                }
                """;

        // Consume flat event twice -> idempotency stores only 1
        consumer.onNotificationEvent(flatEvent);
        consumer.onNotificationEvent(flatEvent);

        // Consume wrapped outbox event
        consumer.onNotificationEvent(wrappedEvent);

        // Malformed event without recipientId is safely rejected
        consumer.onNotificationEvent(malformedMissingRecipient);

        assertEquals(2, notificationRepository.count());

        Notification first = notificationRepository.findAll().stream()
                .filter(n -> "IDN-NOTIF-1001".equals(n.getEventId()))
                .findFirst()
                .orElseThrow();

        // User 1 retrieves own notifications and unread count
        mockMvc.perform(get("/api/v1/notifications")
                        .with(jwt().jwt(j -> j.subject("user-sub-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2));

        mockMvc.perform(get("/api/v1/notifications/unread/count")
                        .with(jwt().jwt(j -> j.subject("user-sub-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(2));

        // User 2 (different authenticated user) CANNOT read, mark read, or delete User 1's notification (IDOR protection)
        mockMvc.perform(get("/api/v1/notifications/" + first.getNotificationId())
                        .with(jwt().jwt(j -> j.subject("user-sub-2"))))
                .andExpect(status().isNotFound());

        mockMvc.perform(patch("/api/v1/notifications/" + first.getNotificationId() + "/read")
                        .with(jwt().jwt(j -> j.subject("user-sub-2"))))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/notifications/" + first.getNotificationId())
                        .with(jwt().jwt(j -> j.subject("user-sub-2"))))
                .andExpect(status().isNotFound());

        // User 1 marks one as read
        mockMvc.perform(patch("/api/v1/notifications/" + first.getNotificationId() + "/read")
                        .with(jwt().jwt(j -> j.subject("user-sub-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        mockMvc.perform(get("/api/v1/notifications/unread/count")
                        .with(jwt().jwt(j -> j.subject("user-sub-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));

        // User 1 marks all as read
        mockMvc.perform(patch("/api/v1/notifications/read-all")
                        .with(jwt().jwt(j -> j.subject("user-sub-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedCount").value(1));

        mockMvc.perform(get("/api/v1/notifications/unread/count")
                        .with(jwt().jwt(j -> j.subject("user-sub-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));

        // User 1 deletes own notification
        mockMvc.perform(delete("/api/v1/notifications/" + first.getNotificationId())
                        .with(jwt().jwt(j -> j.subject("user-sub-1"))))
                .andExpect(status().isNoContent());

        assertEquals(1, notificationRepository.count());
    }

    @Test
    void swaggerOpenApiDocsExposeNotificationEndpointsAndBearerAuth() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/notifications']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/notifications/unread']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/notifications/unread/count']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/notifications/{notificationId}']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/notifications/{notificationId}/read']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/notifications/read-all']").exists())
                .andExpect(jsonPath("$.components.securitySchemes.BearerAuth").exists());
    }
}
