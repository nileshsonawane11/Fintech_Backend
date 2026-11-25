package com.fintech.payment.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.entity.PaymentInboxEvent;
import com.fintech.payment.entity.PaymentOutboxEvent;
import com.fintech.payment.event.consumer.PaymentKafkaConsumer;
import com.fintech.payment.event.producer.PaymentOutboxPublisherTask;
import com.fintech.payment.repository.PaymentInboxEventRepository;
import com.fintech.payment.repository.PaymentOutboxEventRepository;
import com.fintech.payment.service.IncomingPaymentService;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentKafkaTest {

    @Mock private PaymentOutboxEventRepository outboxRepository;
    @Mock private KafkaTemplate<String, String> kafkaTemplate;
    @Mock private PaymentInboxEventRepository inboxRepository;
    @Mock private IncomingPaymentService incomingPaymentService;

    @Test
    void outboxPublisherSendsEventAndMarksPublishedOrRetriesOnFailure() {
        PaymentOutboxEvent okEvent = new PaymentOutboxEvent();
        okEvent.setEventId("evt-1");
        okEvent.setAggregateId("PAY-1");
        okEvent.setEventType("TransferCompleted");
        okEvent.setTopic("payment.transfer-events.v1");
        okEvent.setPayload("{\"eventId\":\"evt-1\"}");
        okEvent.setCorrelationId("corr-1");
        okEvent.setPublishingStatus("PENDING");
        okEvent.setNextAttemptAt(Instant.now());

        PaymentOutboxEvent failEvent = new PaymentOutboxEvent();
        failEvent.setEventId("evt-2");
        failEvent.setAggregateId("PAY-2");
        failEvent.setEventType("TransferFailed");
        failEvent.setTopic("payment.transfer-events.v1");
        failEvent.setPayload("{\"eventId\":\"evt-2\"}");
        failEvent.setPublishingStatus("PENDING");
        failEvent.setRetryCount(4);
        failEvent.setNextAttemptAt(Instant.now());

        when(outboxRepository.findDuePendingEvents(any(), eq(5), any())).thenReturn(List.of(okEvent, failEvent));
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture(null))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Broker unavailable")));

        PaymentOutboxPublisherTask task = new PaymentOutboxPublisherTask(outboxRepository, kafkaTemplate, 5, 50);
        task.publishPendingEvents();

        assertEquals("PUBLISHED", okEvent.getPublishingStatus());
        assertNotNull(okEvent.getPublishedAt());
        assertEquals("FAILED", failEvent.getPublishingStatus());
        assertEquals(5, failEvent.getRetryCount());
    }

    @Test
    void kafkaConsumerIsIdempotentAndSuspendsReceiversOnAccountClosed() {
        PaymentKafkaConsumer consumer = new PaymentKafkaConsumer(
                inboxRepository, incomingPaymentService, new ObjectMapper().findAndRegisterModules());

        String eventJson = """
                {
                  "eventId": "acc-evt-100",
                  "eventType": "AccountClosedEvent",
                  "aggregateId": "ACC-1001",
                  "payload": { "accountId": "ACC-1001" }
                }
                """;

        when(inboxRepository.existsById("acc-evt-100")).thenReturn(false).thenReturn(true);
        when(inboxRepository.saveAndFlush(any(PaymentInboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        consumer.onAccountLifecycleEvent(eventJson);
        consumer.onAccountLifecycleEvent(eventJson);

        verify(incomingPaymentService, times(1)).suspendReceiversForAccount("ACC-1001", "AccountClosedEvent");
    }

    @Test
    void kafkaConsumerMarksFailedAndRethrowsOnProcessingError() {
        PaymentKafkaConsumer consumer = new PaymentKafkaConsumer(
                inboxRepository, incomingPaymentService, new ObjectMapper().findAndRegisterModules());

        String eventJson = """
                {
                  "eventId": "acc-evt-err",
                  "eventType": "AccountBlockedEvent",
                  "aggregateId": "ACC-999",
                  "payload": { "accountId": "ACC-999" }
                }
                """;

        when(inboxRepository.existsById("acc-evt-err")).thenReturn(false);
        when(inboxRepository.saveAndFlush(any(PaymentInboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new IllegalStateException("DB error"))
                .when(incomingPaymentService).suspendReceiversForAccount("ACC-999", "AccountBlockedEvent");

        assertThrows(IllegalStateException.class, () -> consumer.onAccountLifecycleEvent(eventJson));
        verify(inboxRepository).save(argThat(inb -> "FAILED".equals(inb.getStatus())));
    }
}
