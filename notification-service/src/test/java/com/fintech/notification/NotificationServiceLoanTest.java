package com.fintech.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.notification.dto.request.CreateNotificationRequest;
import com.fintech.notification.dto.response.NotificationListResponse;
import com.fintech.notification.entity.Notification;
import com.fintech.notification.event.LoanNotificationKafkaConsumer;
import com.fintech.notification.repository.NotificationRepository;
import com.fintech.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceLoanTest {

    @Mock private NotificationRepository notificationRepository;

    private NotificationService notificationService;
    private LoanNotificationKafkaConsumer kafkaConsumer;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository);
        kafkaConsumer = new LoanNotificationKafkaConsumer(
                notificationService, new ObjectMapper().findAndRegisterModules());
    }

    @Test
    void consumerProcessesLoanNotificationEventIdempotently() {
        String kafkaPayload = """
                {
                  "eventId": "env-1",
                  "eventType": "LoanNotificationRequested",
                  "payload": {
                    "eventId": "LOAN-NOTIF-100",
                    "recipientId": "sub-cust-1",
                    "targetRole": "CUSTOMER",
                    "templateCode": "LOAN_APPROVED_OFFER_AVAILABLE",
                    "channel": "IN_APP",
                    "title": "Loan Approved!",
                    "body": "Offer available for LN-APP-1",
                    "referenceId": "LN-APP-1",
                    "createdAt": "2026-11-26T10:00:00Z"
                  }
                }
                """;

        when(notificationRepository.existsByEventId("LOAN-NOTIF-100"))
                .thenReturn(false)
                .thenReturn(true);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        kafkaConsumer.onLoanNotificationEvent(kafkaPayload);
        kafkaConsumer.onLoanNotificationEvent(kafkaPayload); // duplicate ignored

        verify(notificationRepository, times(1)).save(argThat(n ->
                "sub-cust-1".equals(n.getCustomerId())
                        && "CUSTOMER".equals(n.getTargetRole())
                        && "LOAN-NOTIF-100".equals(n.getEventId())
                        && "LN-APP-1".equals(n.getReferenceId())
        ));
    }

    @Test
    void listNotificationsSupportsRoleAwareRetrieval() {
        Notification roleNotif = new Notification();
        roleNotif.setNotificationId("NOT-ROLE-1");
        roleNotif.setCustomerId("ROLE:LOAN_OFFICER");
        roleNotif.setTargetRole("LOAN_OFFICER");
        roleNotif.setTemplateCode("NEW_LOAN_APPLICATION_QUEUE");
        roleNotif.setChannel("IN_APP");
        roleNotif.setTitle("New Application");
        roleNotif.setBody("Awaiting review");
        roleNotif.setRead(false);
        roleNotif.setCreatedAt(Instant.now());

        when(notificationRepository.findForRecipientOrRoles(
                eq("officer-1"), eq(Set.of("LOAN_OFFICER")), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(roleNotif)));

        NotificationListResponse resp = notificationService.listNotifications(
                "officer-1", Set.of("LOAN_OFFICER"), false, 20);

        assertEquals(1, resp.getData().size());
        assertEquals("NOT-ROLE-1", resp.getData().get(0).getNotificationId());
    }
}
