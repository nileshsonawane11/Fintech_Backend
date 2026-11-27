package com.fintech.loan.event.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.entity.LoanApplication;
import com.fintech.loan.entity.LoanInboxEvent;
import com.fintech.loan.repository.LoanApplicationRepository;
import com.fintech.loan.repository.LoanInboxEventRepository;
import com.fintech.loan.service.LoanNotificationService;
import com.fintech.loan.service.LoanRepaymentService;
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
import java.util.List;

@Component
public class LoanKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(LoanKafkaConsumer.class);

    private final LoanInboxEventRepository inboxRepository;
    private final LoanApplicationRepository applicationRepository;
    private final LoanNotificationService notificationService;
    private final LoanRepaymentService repaymentService;
    private final ObjectMapper objectMapper;

    public LoanKafkaConsumer(
            LoanInboxEventRepository inboxRepository,
            LoanApplicationRepository applicationRepository,
            LoanNotificationService notificationService,
            LoanRepaymentService repaymentService,
            ObjectMapper objectMapper) {
        this.inboxRepository = inboxRepository;
        this.applicationRepository = applicationRepository;
        this.notificationService = notificationService;
        this.repaymentService = repaymentService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.account-lifecycle-events:" + LoanConstants.TOPIC_ACCOUNT_LIFECYCLE + "}",
            groupId = "${spring.kafka.consumer.group-id:" + LoanConstants.CONSUMER_GROUP_LOAN + "}"
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
        LoanInboxEvent inbox = new LoanInboxEvent();
        inbox.setEventId(eventId);
        inbox.setTopic(LoanConstants.TOPIC_ACCOUNT_LIFECYCLE);
        inbox.setEventType(eventType);
        inbox.setConsumerGroup(LoanConstants.CONSUMER_GROUP_LOAN);
        inbox.setPayload(rawPayload);
        inbox.setStatus("PROCESSING");
        try {
            inboxRepository.saveAndFlush(inbox);
        } catch (DataIntegrityViolationException ex) {
            return;
        }

        try {
            if ("AccountClosedEvent".equals(eventType)
                    || "AccountBlockedEvent".equals(eventType)
                    || "AccountFrozenEvent".equals(eventType)) {
                String accountId = root.path("payload").path("accountId")
                        .asText(root.path("aggregateId").asText(""));
                if (!accountId.isBlank()) {
                    List<LoanApplication> impacted = applicationRepository.findAllByDisbursementAccountIdAndStatusIn(
                            accountId,
                            List.of("SUBMITTED", "UNDER_REVIEW", "DOCUMENT_VERIFICATION",
                                    "APPROVED", "OFFER_ACCEPTED", "DISBURSEMENT_PENDING")
                    );
                    for (LoanApplication app : impacted) {
                        notificationService.notifyRole(
                                LoanConstants.ROLE_LOAN_MANAGER, null,
                                "DISBURSEMENT_ACCOUNT_ALERT",
                                "Account Status Alert for Loan " + app.getLoanApplicationId(),
                                "Disbursement account " + accountId + " received event " + eventType
                                        + ". Verify alternate disbursement account before disbursal.",
                                app.getLoanApplicationId()
                        );
                    }
                }
            }
            inbox.setStatus("PROCESSED");
            inbox.setProcessedAt(Instant.now());
            inboxRepository.save(inbox);
        } catch (RuntimeException ex) {
            inbox.setStatus("FAILED");
            inbox.setErrorMessage(ex.getMessage() != null && ex.getMessage().length() > 490
                    ? ex.getMessage().substring(0, 490)
                    : ex.getMessage());
            inboxRepository.save(inbox);
            throw ex;
        }
    }

    @KafkaListener(
            topics = "${app.kafka.topics.payment-incoming-events:payment.incoming-events.v1}",
            groupId = "${spring.kafka.consumer.group-id:" + LoanConstants.CONSUMER_GROUP_LOAN + "}"
    )
    @Transactional
    public void onPaymentIncomingEvent(String rawPayload) {
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
            return;
        }

        String eventType = root.path("eventType").asText("UNKNOWN");
        LoanInboxEvent inbox = new LoanInboxEvent();
        inbox.setEventId(eventId);
        inbox.setTopic("payment.incoming-events.v1");
        inbox.setEventType(eventType);
        inbox.setConsumerGroup(LoanConstants.CONSUMER_GROUP_LOAN);
        inbox.setPayload(rawPayload);
        inbox.setStatus("PROCESSING");
        try {
            inboxRepository.saveAndFlush(inbox);
        } catch (DataIntegrityViolationException ex) {
            return;
        }

        try {
            if ("LoanRepaymentPaymentConfirmed".equals(eventType)) {
                JsonNode payload = root.path("payload");
                String loanAccountId = payload.path("loanAccountId").asText("");
                String paymentId = payload.path("paymentId").asText("");
                String rzpPaymentId = payload.path("razorpayPaymentId").asText(null);
                String currency = payload.path("currency").asText("INR");
                java.math.BigDecimal amount = new java.math.BigDecimal(payload.path("amount").asText("0"));
                if (!loanAccountId.isBlank() && !paymentId.isBlank() && amount.compareTo(java.math.BigDecimal.ZERO) > 0) {
                    repaymentService.applyRazorpayRepaymentConfirmed(
                            loanAccountId, paymentId, amount, currency, rzpPaymentId);
                }
            }
            inbox.setStatus("PROCESSED");
            inbox.setProcessedAt(Instant.now());
            inboxRepository.save(inbox);
        } catch (RuntimeException ex) {
            inbox.setStatus("FAILED");
            inbox.setErrorMessage(ex.getMessage() != null && ex.getMessage().length() > 490
                    ? ex.getMessage().substring(0, 490)
                    : ex.getMessage());
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
