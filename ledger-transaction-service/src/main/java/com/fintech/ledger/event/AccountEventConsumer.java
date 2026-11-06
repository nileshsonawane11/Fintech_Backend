package com.fintech.ledger.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.AccountSubtype;
import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.enums.NormalBalance;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Component
public class AccountEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(AccountEventConsumer.class);

    private final LedgerAccountRepository accountRepository;
    private final LedgerBalanceSnapshotRepository snapshotRepository;
    private final LedgerEventProducer eventProducer;
    private final ObjectMapper objectMapper;

    public AccountEventConsumer(LedgerAccountRepository accountRepository,
                                LedgerBalanceSnapshotRepository snapshotRepository,
                                LedgerEventProducer eventProducer,
                                ObjectMapper objectMapper) {
        this.accountRepository = accountRepository;
        this.snapshotRepository = snapshotRepository;
        this.eventProducer = eventProducer;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "${app.kafka.topics.account-lifecycle:account.lifecycle-events.v1}",
                   groupId = "${spring.kafka.consumer.group-id:ledger-service-group}")
    @Transactional
    public void handleAccountLifecycleEvent(String message) {
        try {
            JsonNode rootNode = objectMapper.readTree(message);
            String eventType = rootNode.has("eventType") ? rootNode.get("eventType").asText() : "";
            JsonNode payloadNode = rootNode.has("payload") ? rootNode.get("payload") : rootNode;

            log.info("Received account lifecycle event: {}", eventType);

            if ("ACCOUNT_CREATED".equalsIgnoreCase(eventType) || "AccountCreatedEvent".equalsIgnoreCase(eventType)) {
                processAccountCreated(payloadNode);
            } else if ("ACCOUNT_FROZEN".equalsIgnoreCase(eventType)) {
                processAccountFrozen(payloadNode);
            } else if ("ACCOUNT_UNFROZEN".equalsIgnoreCase(eventType)) {
                processAccountUnfrozen(payloadNode);
            } else if ("ACCOUNT_CLOSED".equalsIgnoreCase(eventType)) {
                processAccountClosed(payloadNode);
            }
        } catch (Exception ex) {
            log.error("Failed to process account lifecycle event: {}", ex.getMessage(), ex);
        }
    }

    private void processAccountCreated(JsonNode payload) {
        String accountId = payload.has("accountId") ? payload.get("accountId").asText() : null;
        if (accountId == null || accountId.isBlank()) {
            log.warn("Account created event missing accountId, skipping");
            return;
        }

        // 1. Idempotency check: verify if ledger account already exists
        if (accountRepository.findByAccountReference(accountId).isPresent()) {
            log.info("Ledger account already exists for accountReference: {}, skipping duplicate provisioning", accountId);
            return;
        }

        String ledgerAccountId = "LA-" + accountId;
        String currency = payload.has("currency") ? payload.get("currency").asText() : "INR";
        UUID customerId = null;
        if (payload.has("customerId") && !payload.get("customerId").isNull()) {
            try {
                customerId = UUID.fromString(payload.get("customerId").asText());
            } catch (Exception ignored) {}
        }

        UUID bankAccountId = null;
        if (payload.has("bankAccountId") && !payload.get("bankAccountId").isNull()) {
            try {
                bankAccountId = UUID.fromString(payload.get("bankAccountId").asText());
            } catch (Exception ignored) {}
        }

        // 2. Create customer liability ledger account
        LedgerAccount ledgerAccount = new LedgerAccount(
                UUID.randomUUID(),
                ledgerAccountId,
                bankAccountId,
                accountId,
                customerId,
                "Customer Deposit Account - " + accountId,
                AccountType.LIABILITY,
                AccountSubtype.CUSTOMER_DEPOSIT,
                NormalBalance.CREDIT,
                currency,
                AccountStatus.ACTIVE
        );
        ledgerAccount = accountRepository.save(ledgerAccount);

        // 3. Initialize balance projection to zero
        LedgerBalanceSnapshot snapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(),
                ledgerAccount,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                currency
        );
        snapshotRepository.save(snapshot);

        // 4. Publish LedgerAccountCreatedEvent
        eventProducer.enqueueEvent(
                ledgerAccountId,
                "LedgerAccount",
                "LEDGER_ACCOUNT_CREATED",
                UUID.randomUUID().toString(),
                new LedgerEvents.LedgerAccountCreatedPayload(
                        ledgerAccountId,
                        accountId,
                        customerId,
                        AccountType.LIABILITY,
                        currency,
                        Instant.now()
                )
        );

        log.info("Successfully provisioned ledger account {} for bank account reference {}", ledgerAccountId, accountId);
    }

    private void processAccountFrozen(JsonNode payload) {
        String accountId = payload.has("accountId") ? payload.get("accountId").asText() : null;
        if (accountId != null) {
            accountRepository.findByAccountReference(accountId).ifPresent(account -> {
                account.setStatus(AccountStatus.FROZEN);
                accountRepository.save(account);
                log.info("Ledger account {} marked as FROZEN", account.getLedgerAccountId());
            });
        }
    }

    private void processAccountUnfrozen(JsonNode payload) {
        String accountId = payload.has("accountId") ? payload.get("accountId").asText() : null;
        if (accountId != null) {
            accountRepository.findByAccountReference(accountId).ifPresent(account -> {
                account.setStatus(AccountStatus.ACTIVE);
                accountRepository.save(account);
                log.info("Ledger account {} un-frozen to ACTIVE", account.getLedgerAccountId());
            });
        }
    }

    private void processAccountClosed(JsonNode payload) {
        String accountId = payload.has("accountId") ? payload.get("accountId").asText() : null;
        if (accountId != null) {
            accountRepository.findByAccountReference(accountId).ifPresent(account -> {
                account.setStatus(AccountStatus.CLOSED);
                accountRepository.save(account);
                log.info("Ledger account {} marked as CLOSED", account.getLedgerAccountId());
            });
        }
    }
}
