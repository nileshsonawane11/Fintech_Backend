package com.fintech.investment.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.entity.Investment;
import com.fintech.investment.entity.InvestmentEnums.InvestmentStatus;
import com.fintech.investment.entity.InvestmentInboxEvent;
import com.fintech.investment.entity.InvestmentOpsAlert;
import com.fintech.investment.repository.InvestmentInboxEventRepository;
import com.fintech.investment.repository.InvestmentOpsAlertRepository;
import com.fintech.investment.repository.InvestmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = true)
public class InvestmentKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(InvestmentKafkaConsumer.class);

    private final InvestmentInboxEventRepository inboxRepository;
    private final InvestmentRepository investmentRepository;
    private final InvestmentOpsAlertRepository alertRepository;
    private final ObjectMapper objectMapper;

    public InvestmentKafkaConsumer(
            InvestmentInboxEventRepository inboxRepository,
            InvestmentRepository investmentRepository,
            InvestmentOpsAlertRepository alertRepository,
            ObjectMapper objectMapper) {
        this.inboxRepository = inboxRepository;
        this.investmentRepository = investmentRepository;
        this.alertRepository = alertRepository;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = InvestmentConstants.TOPIC_ACCOUNT_LIFECYCLE,
            groupId = "${spring.kafka.consumer.group-id:investment-service-group}")
    @Transactional
    public void onAccountLifecycleEvent(String rawPayload) {
        try {
            JsonNode root = objectMapper.readTree(rawPayload);
            String eventId = root.path("eventId").asText("");
            String eventType = root.path("eventType").asText("");
            if (eventId.isBlank() || inboxRepository.existsById(eventId)) {
                return;
            }

            if ("AccountClosedEvent".equals(eventType) || "AccountBlockedEvent".equals(eventType)
                    || "AccountFrozenEvent".equals(eventType)) {
                String accountId = root.path("aggregateId").asText(root.path("accountId").asText(""));
                if (!accountId.isBlank()) {
                    List<Investment> affected = investmentRepository.findByFundingAccountIdAndStatusIn(
                            accountId, List.of(InvestmentStatus.ACTIVE, InvestmentStatus.PAUSED));
                    for (Investment inv : affected) {
                        InvestmentOpsAlert alert = new InvestmentOpsAlert();
                        alert.setAlertId("ALT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                        alert.setInvestmentId(inv.getInvestmentId());
                        alert.setIdentitySubject(inv.getIdentitySubject());
                        alert.setAlertType("FUNDING_ACCOUNT_" + eventType.toUpperCase());
                        alert.setSeverity("HIGH");
                        alert.setDescription("Funding account " + accountId + " received " + eventType
                                + " while investment " + inv.getInvestmentId() + " is " + inv.getStatus());
                        alertRepository.save(alert);
                    }
                }
            }

            InvestmentInboxEvent inbox = new InvestmentInboxEvent();
            inbox.setEventId(eventId);
            inbox.setTopic(InvestmentConstants.TOPIC_ACCOUNT_LIFECYCLE);
            inbox.setEventType(eventType);
            inboxRepository.save(inbox);
        } catch (Exception ex) {
            log.error("Failed processing account lifecycle event: {}", ex.getMessage());
            throw new RuntimeException(ex);
        }
    }
}
