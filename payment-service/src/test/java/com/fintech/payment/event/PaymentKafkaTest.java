package com.fintech.payment.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.entity.PaymentInboxEvent;
import com.fintech.payment.event.consumer.PaymentKafkaConsumer;
import com.fintech.payment.repository.PaymentInboxEventRepository;
import com.fintech.payment.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentKafkaTest {

    @Mock private PaymentInboxEventRepository inboxRepository;
    @Mock private PaymentService paymentService;

    private PaymentKafkaConsumer consumer;

    @BeforeEach
    void setUp() {
        consumer = new PaymentKafkaConsumer(inboxRepository, paymentService, new ObjectMapper());
    }

    @Test
    void onLedgerTransactionEvent_marksLedgerPostedIdempotently() {
        String payload = """
                {"eventId":"evt-1","eventType":"TRANSACTION_EXTERNAL_DEPOSIT_POSTED","payload":{"paymentId":"PAY-100","ledgerTransactionId":"TXN-999"}}
                """;
        when(inboxRepository.existsById("evt-1")).thenReturn(false).thenReturn(true);
        when(inboxRepository.saveAndFlush(any(PaymentInboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));
        when(inboxRepository.save(any(PaymentInboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        consumer.onLedgerTransactionEvent(payload);
        consumer.onLedgerTransactionEvent(payload);

        verify(paymentService, times(1)).markLedgerPosted("PAY-100", "TXN-999");
    }

    @Test
    void onLedgerTransactionEvent_ignoresUnrelatedEvents() {
        String payload = """
                {"eventId":"evt-2","eventType":"BALANCE_UPDATED","payload":{"accountId":"ACC-1"}}
                """;
        when(inboxRepository.existsById("evt-2")).thenReturn(false);
        when(inboxRepository.saveAndFlush(any(PaymentInboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));
        when(inboxRepository.save(any(PaymentInboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        consumer.onLedgerTransactionEvent(payload);

        verifyNoInteractions(paymentService);
    }
}
