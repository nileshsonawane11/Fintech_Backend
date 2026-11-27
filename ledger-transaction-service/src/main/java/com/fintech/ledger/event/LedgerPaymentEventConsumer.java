package com.fintech.ledger.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.entity.LedgerInboxEvent;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.repository.LedgerInboxEventRepository;
import com.fintech.ledger.service.LedgerPostingEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Component
public class LedgerPaymentEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(LedgerPaymentEventConsumer.class);
    private static final String SYSTEM_SETTLEMENT_INR = "SYSTEM-SETTLEMENT-INR";

    private final LedgerInboxEventRepository inboxRepository;
    private final LedgerPostingEngine postingEngine;
    private final LedgerEventProducer eventProducer;
    private final ObjectMapper objectMapper;

    public LedgerPaymentEventConsumer(
            LedgerInboxEventRepository inboxRepository,
            LedgerPostingEngine postingEngine,
            LedgerEventProducer eventProducer,
            ObjectMapper objectMapper) {
        this.inboxRepository = inboxRepository;
        this.postingEngine = postingEngine;
        this.eventProducer = eventProducer;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.payment-incoming-events:payment.incoming-events.v1}",
            groupId = "${spring.kafka.consumer.group-id:ledger-service-group}"
    )
    @Transactional
    public void onPaymentEvent(String rawPayload) {
        if (rawPayload == null || rawPayload.isBlank()) {
            return;
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(rawPayload);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid JSON in payment incoming event", ex);
        }

        String eventId = root.path("eventId").asText("");
        if (eventId.isBlank()) {
            eventId = hashFallback(rawPayload);
        }
        if (inboxRepository.existsById(eventId)) {
            log.debug("Duplicate payment event ignored idempotently: eventId={}", eventId);
            return;
        }

        String eventType = root.path("eventType").asText("UNKNOWN");
        String correlationId = root.path("correlationId").asText(eventId);
        LedgerInboxEvent inbox = new LedgerInboxEvent();
        inbox.setEventId(eventId);
        inbox.setTopic("payment.incoming-events.v1");
        inbox.setEventType(eventType);
        inbox.setConsumerGroup("ledger-service-group");
        inbox.setPayload(rawPayload);
        inbox.setStatus("PROCESSING");
        try {
            inboxRepository.saveAndFlush(inbox);
        } catch (DataIntegrityViolationException ex) {
            return;
        }

        try {
            JsonNode payload = root.path("payload");
            if ("ExternalAccountDepositConfirmed".equals(eventType)) {
                handleExternalDepositConfirmed(payload, correlationId);
            } else if ("PaymentRefunded".equals(eventType)) {
                handlePaymentRefunded(payload, correlationId);
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

    private void handleExternalDepositConfirmed(JsonNode payload, String correlationId) {
        String paymentId = payload.path("paymentId").asText("");
        String destinationAccountId = payload.path("destinationAccountId").asText("");
        String identitySubject = payload.path("identitySubject").asText("SYSTEM");
        String rzpPaymentId = payload.path("razorpayPaymentId").asText("");
        String currency = payload.path("currency").asText("INR");
        BigDecimal amount = new BigDecimal(payload.path("amount").asText("0"));

        if (paymentId.isBlank() || destinationAccountId.isBlank() || amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipping invalid ExternalAccountDepositConfirmed payload: paymentId={}", paymentId);
            return;
        }

        LedgerPostingResponse posting = postingEngine.post(
                TransactionType.DEPOSIT,
                currency,
                correlationId,
                "Razorpay external deposit (" + rzpPaymentId + ")",
                paymentId,
                "RZP-DEP-" + paymentId,
                identitySubject,
                "PAYMENT-SERVICE",
                List.of(
                        new PostingEntryItem(SYSTEM_SETTLEMENT_INR, EntryType.DEBIT, amount,
                                "Razorpay merchant collection", paymentId),
                        new PostingEntryItem(destinationAccountId, EntryType.CREDIT, amount,
                                "Customer account credit via Razorpay", paymentId)
                )
        );

        eventProducer.enqueueEvent(
                paymentId,
                "LedgerTransaction",
                "TRANSACTION_EXTERNAL_DEPOSIT_POSTED",
                correlationId,
                Map.of(
                        "paymentId", paymentId,
                        "ledgerTransactionId", posting.transactionId(),
                        "destinationAccountId", destinationAccountId,
                        "amount", amount,
                        "currency", currency
                )
        );
    }

    private void handlePaymentRefunded(JsonNode payload, String correlationId) {
        String purpose = payload.path("purpose").asText("");
        if (!"ACCOUNT_DEPOSIT".equalsIgnoreCase(purpose)) {
            return;
        }
        String refundId = payload.path("refundId").asText("");
        String paymentId = payload.path("paymentId").asText("");
        String destinationAccountId = payload.path("destinationAccountId").asText("");
        String identitySubject = payload.path("identitySubject").asText("SYSTEM");
        String currency = payload.path("currency").asText("INR");
        BigDecimal refundAmount = new BigDecimal(payload.path("refundAmount").asText("0"));

        if (refundId.isBlank() || destinationAccountId.isBlank() || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        postingEngine.post(
                TransactionType.REFUND,
                currency,
                correlationId,
                "Razorpay deposit refund (" + refundId + ")",
                refundId,
                "RZP-REF-" + refundId,
                identitySubject,
                "PAYMENT-SERVICE",
                List.of(
                        new PostingEntryItem(destinationAccountId, EntryType.DEBIT, refundAmount,
                                "Deposit refund debit", paymentId),
                        new PostingEntryItem(SYSTEM_SETTLEMENT_INR, EntryType.CREDIT, refundAmount,
                                "Razorpay merchant refund settlement", refundId)
                )
        );
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
