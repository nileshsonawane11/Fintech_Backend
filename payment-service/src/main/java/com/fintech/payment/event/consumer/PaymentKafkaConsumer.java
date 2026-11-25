package com.fintech.payment.event.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.entity.PaymentInboxEvent;
import com.fintech.payment.repository.PaymentInboxEventRepository;
import com.fintech.payment.service.IncomingPaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

@Component
public class PaymentKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentKafkaConsumer.class);

    private final PaymentInboxEventRepository inboxRepository;
    private final IncomingPaymentService incomingPaymentService;
    private final ObjectMapper objectMapper;

    public PaymentKafkaConsumer(
            PaymentInboxEventRepository inboxRepository,
            IncomingPaymentService incomingPaymentService,
            ObjectMapper objectMapper) {
        this.inboxRepository = inboxRepository;
        this.incomingPaymentService = incomingPaymentService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.account-lifecycle-events:" + PaymentConstants.TOPIC_ACCOUNT_LIFECYCLE + "}",
            groupId = "${spring.kafka.consumer.group-id:" + PaymentConstants.CONSUMER_GROUP_PAYMENT + "}"
    )
    @Transactional
    public void onAccountLifecycleEvent(String rawPayload) {
        if (rawPayload == null || rawPayload.isBlank()) {
            return;
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(rawPayload);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid JSON in account lifecycle event", ex);
        }

        String eventId = root.path("eventId").asText("");
        if (eventId.isBlank()) {
            eventId = hashFallback(rawPayload);
        }
        if (inboxRepository.existsById(eventId)) {
            log.debug("Duplicate Kafka event ignored idempotently: eventId={}", eventId);
            return;
        }

        String eventType = root.path("eventType").asText("UNKNOWN");
        PaymentInboxEvent inbox = new PaymentInboxEvent();
        inbox.setEventId(eventId);
        inbox.setTopic(PaymentConstants.TOPIC_ACCOUNT_LIFECYCLE);
        inbox.setEventType(eventType);
        inbox.setConsumerGroup(PaymentConstants.CONSUMER_GROUP_PAYMENT);
        inbox.setPayload(rawPayload);
        inbox.setStatus("PROCESSING");
        try {
            inboxRepository.saveAndFlush(inbox);
        } catch (DataIntegrityViolationException ex) {
            return;
        }

        try {
            if ("AccountClosedEvent".equals(eventType) || "AccountBlockedEvent".equals(eventType)) {
                String accountId = root.path("payload").path("accountId").asText(root.path("aggregateId").asText(""));
                if (!accountId.isBlank()) {
                    incomingPaymentService.suspendReceiversForAccount(accountId, eventType);
                }
            }
            inbox.setStatus("PROCESSED");
            inbox.setProcessedAt(Instant.now());
            inboxRepository.save(inbox);
        } catch (RuntimeException ex) {
            inbox.setStatus("FAILED");
            inbox.setErrorMessage(ex.getMessage() != null && ex.getMessage().length() > 490
                    ? ex.getMessage().substring(0, 490) : ex.getMessage());
            inboxRepository.save(inbox);
            throw ex;
        }
    }

    private String hashFallback(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return "INB-" + HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8))).substring(0, 32);
        } catch (Exception ex) {
            return "INB-" + Integer.toHexString(raw.hashCode());
        }
    }
}
