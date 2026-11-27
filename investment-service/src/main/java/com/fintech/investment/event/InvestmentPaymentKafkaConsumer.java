package com.fintech.investment.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.investment.client.LedgerServiceClient;
import com.fintech.investment.client.dto.ExternalDtos.LedgerPostingResponseDto;
import com.fintech.investment.client.dto.ExternalDtos.MultiLinePostingRequest;
import com.fintech.investment.client.dto.ExternalDtos.PostingEntryRequest;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.entity.Investment;
import com.fintech.investment.entity.InvestmentEnums.TransactionDirection;
import com.fintech.investment.entity.InvestmentEnums.TransactionStatus;
import com.fintech.investment.entity.InvestmentEnums.TransactionType;
import com.fintech.investment.entity.InvestmentInboxEvent;
import com.fintech.investment.entity.InvestmentTransaction;
import com.fintech.investment.repository.InvestmentInboxEventRepository;
import com.fintech.investment.repository.InvestmentRepository;
import com.fintech.investment.repository.InvestmentTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = true)
public class InvestmentPaymentKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(InvestmentPaymentKafkaConsumer.class);
    private static final String SYSTEM_SETTLEMENT_INR = "SYSTEM-SETTLEMENT-INR";

    private final InvestmentInboxEventRepository inboxRepository;
    private final InvestmentRepository investmentRepository;
    private final InvestmentTransactionRepository transactionRepository;
    private final LedgerServiceClient ledgerServiceClient;
    private final ObjectMapper objectMapper;

    public InvestmentPaymentKafkaConsumer(
            InvestmentInboxEventRepository inboxRepository,
            InvestmentRepository investmentRepository,
            InvestmentTransactionRepository transactionRepository,
            LedgerServiceClient ledgerServiceClient,
            ObjectMapper objectMapper) {
        this.inboxRepository = inboxRepository;
        this.investmentRepository = investmentRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerServiceClient = ledgerServiceClient;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "${app.kafka.topics.payment-incoming-events:payment.incoming-events.v1}",
            groupId = "${spring.kafka.consumer.group-id:" + InvestmentConstants.CONSUMER_GROUP_INVESTMENT + "}"
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
        String correlationId = root.path("correlationId").asText(eventId);
        if ("InvestmentPaymentConfirmed".equals(eventType)) {
            handleInvestmentPaymentConfirmed(root.path("payload"), correlationId);
        }

        InvestmentInboxEvent inbox = new InvestmentInboxEvent();
        inbox.setEventId(eventId);
        inbox.setTopic("payment.incoming-events.v1");
        inbox.setEventType(eventType);
        inboxRepository.save(inbox);
    }

    private void handleInvestmentPaymentConfirmed(JsonNode payload, String correlationId) {
        String paymentId = payload.path("paymentId").asText("");
        String investmentRef = payload.path("investmentReference").asText("");
        String rzpPaymentId = payload.path("razorpayPaymentId").asText("");
        String currency = payload.path("currency").asText("INR");
        BigDecimal amount = new BigDecimal(payload.path("amount").asText("0")).setScale(2, RoundingMode.HALF_UP);

        if (paymentId.isBlank() || investmentRef.isBlank() || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        Investment inv = investmentRepository.findByInvestmentId(investmentRef).orElse(null);
        if (inv == null) {
            log.warn("Investment not found for external payment confirmation: investmentRef={}, paymentId={}",
                    investmentRef, paymentId);
            return;
        }

        LedgerPostingResponseDto ledgerResp = ledgerServiceClient.postBatch(
                "RZP-INV-" + paymentId,
                new MultiLinePostingRequest(
                        "TRANSFER",
                        currency,
                        correlationId,
                        "Razorpay investment contribution (" + rzpPaymentId + ")",
                        paymentId,
                        List.of(
                                new PostingEntryRequest(SYSTEM_SETTLEMENT_INR, "DEBIT", amount,
                                        "Razorpay merchant collection", paymentId),
                                new PostingEntryRequest(InvestmentConstants.SYSTEM_INVESTMENT_SETTLEMENT_ACCOUNT,
                                        "CREDIT", amount, "Investment contribution " + inv.getInvestmentId(), paymentId)
                        )
                )
        );

        String txId = "ITX-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        InvestmentTransaction tx = new InvestmentTransaction();
        tx.setTransactionId(txId);
        tx.setInvestmentId(inv.getInvestmentId());
        tx.setIdentitySubject(inv.getIdentitySubject());
        tx.setTransactionType(TransactionType.INSTALLMENT_DEBIT);
        tx.setDirection(TransactionDirection.DEBIT);
        tx.setAmount(amount);
        tx.setCurrency(currency);
        tx.setStatus(TransactionStatus.COMPLETED);
        tx.setAccountId(SYSTEM_SETTLEMENT_INR);
        tx.setLedgerTransactionId(ledgerResp.transactionId());
        tx.setPaymentReference(paymentId);
        tx.setIdempotencyKey("RZP-" + paymentId);
        tx.setCorrelationId(correlationId);
        tx.setRemarks("External Razorpay contribution (" + rzpPaymentId + ")");
        tx.setCompletedAt(Instant.now());
        transactionRepository.save(tx);
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
