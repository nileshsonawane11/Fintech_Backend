package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Dispatches role-aware notifications reliably via the transactional outbox onto Kafka
 * (consumed idempotently by notification-service).
 */
@Service
public class LoanNotificationService {

    private static final Logger log = LoggerFactory.getLogger(LoanNotificationService.class);

    private final LoanOutboxService outboxService;
    private final String notificationTopic;

    public LoanNotificationService(
            LoanOutboxService outboxService,
            @Value("${app.kafka.topics.notification-events:" + LoanConstants.TOPIC_NOTIFICATION_EVENTS + "}")
            String notificationTopic) {
        this.outboxService = outboxService;
        this.notificationTopic = notificationTopic;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void notifyCustomer(String recipientIdentitySubject, String templateCode,
                               String title, String body, String referenceId) {
        enqueueNotification(recipientIdentitySubject, LoanConstants.ROLE_CUSTOMER,
                templateCode, "IN_APP", title, body, referenceId, List.of("CUSTOMER", templateCode));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void notifyRole(String targetRole, String recipientId, String templateCode,
                           String title, String body, String referenceId) {
        String effectiveRecipient = (recipientId != null && !recipientId.isBlank())
                ? recipientId
                : "ROLE:" + targetRole;
        enqueueNotification(effectiveRecipient, targetRole,
                templateCode, "IN_APP", title, body, referenceId, List.of(targetRole, templateCode));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void notifyAdmin(String templateCode, String title, String body, String referenceId) {
        notifyRole(LoanConstants.ROLE_ADMIN, "ROLE:ADMIN", templateCode, title, body, referenceId);
    }

    private void enqueueNotification(String recipientId, String targetRole, String templateCode,
                                     String channel, String title, String body, String referenceId,
                                     List<String> tags) {
        String eventId = "LOAN-NOTIF-" + UUID.randomUUID();
        LoanEvents.LoanNotificationPayload payload = new LoanEvents.LoanNotificationPayload(
                eventId,
                recipientId,
                targetRole,
                templateCode,
                channel,
                title,
                body,
                referenceId,
                tags,
                Instant.now()
        );

        outboxService.enqueueEvent(
                notificationTopic,
                referenceId != null ? referenceId : recipientId,
                "LOAN_NOTIFICATION",
                LoanConstants.EVT_NOTIFICATION_REQUESTED,
                payload
        );
        log.debug("Enqueued role-aware notification: role={}, recipient={}, template={}, ref={}",
                targetRole, recipientId, templateCode, referenceId);
    }
}
