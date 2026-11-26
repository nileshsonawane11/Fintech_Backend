package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountDetailsDto;
import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.event.LedgerEvents;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import com.fintech.ledger.repository.LedgerEntryRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class LedgerPostingEngine {

    private static final Logger log = LoggerFactory.getLogger(LedgerPostingEngine.class);

    private final LedgerTransactionRepository transactionRepository;
    private final LedgerEntryRepository entryRepository;
    private final LedgerBalanceSnapshotRepository snapshotRepository;
    private final AccountServiceClient accountServiceClient;
    private final LedgerEventProducer eventProducer;

    public LedgerPostingEngine(LedgerTransactionRepository transactionRepository,
                               LedgerEntryRepository entryRepository,
                               LedgerBalanceSnapshotRepository snapshotRepository,
                               AccountServiceClient accountServiceClient,
                               LedgerEventProducer eventProducer) {
        this.transactionRepository = transactionRepository;
        this.entryRepository = entryRepository;
        this.snapshotRepository = snapshotRepository;
        this.accountServiceClient = accountServiceClient;
        this.eventProducer = eventProducer;
    }

    /**
     * Executes an atomic, balanced, double-entry financial posting referencing Account Service account IDs.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LedgerPostingResponse post(TransactionType transactionType,
                                      String currency,
                                      String correlationId,
                                      String narrative,
                                      String referenceNumber,
                                      String idempotencyKey,
                                      String initiatedBy,
                                      String sourceService,
                                      List<PostingEntryItem> entries) {

        log.info("Processing ledger posting: type={}, currency={}, entriesCount={}, correlationId={}",
                transactionType, currency, entries.size(), correlationId);

        // 1. Validation: At least two entries required
        if (entries == null || entries.size() < 2) {
            throw LedgerException.unprocessable("INVALID_POSTING", "A double-entry posting requires at least two lines");
        }

        // 1b. Idempotency protection for internal/direct postings
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<LedgerTransaction> existingOpt = transactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existingOpt.isPresent()) {
                LedgerTransaction existing = existingOpt.get();
                if (existing.getTransactionStatus() == TransactionStatus.PROCESSING
                        || existing.getTransactionStatus() == TransactionStatus.INITIATED
                        || existing.getTransactionStatus() == TransactionStatus.PENDING) {
                    throw LedgerException.conflict("CONCURRENT_REQUEST",
                            "A ledger posting with this idempotency key is currently in progress");
                }
                if (existing.getTransactionStatus() == TransactionStatus.SUCCESS) {
                    BigDecimal requestedDebit = entries.stream()
                            .filter(item -> item.entryType() == EntryType.DEBIT && item.amount() != null)
                            .map(item -> item.amount().setScale(4, RoundingMode.HALF_UP))
                            .reduce(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP), BigDecimal::add);
                    if (existing.getTransactionType() != transactionType
                            || !existing.getCurrency().equalsIgnoreCase(currency)
                            || existing.getTotalDebit().compareTo(requestedDebit) != 0) {
                        throw LedgerException.idempotencyKeyReused(
                                "Idempotency key has already been used with a different ledger posting payload");
                    }
                    List<LedgerEntry> existingEntries = entryRepository.findByTransaction_Id(existing.getId());
                    List<String> entryIds = existingEntries.stream().map(LedgerEntry::getEntryId).toList();
                    String debitId = existingEntries.stream()
                            .filter(e -> e.getEntryType() == EntryType.DEBIT)
                            .map(LedgerEntry::getEntryId)
                            .findFirst().orElse(null);
                    String creditId = existingEntries.stream()
                            .filter(e -> e.getEntryType() == EntryType.CREDIT)
                            .map(LedgerEntry::getEntryId)
                            .findFirst().orElse(null);
                    return new LedgerPostingResponse(
                            existing.getTransactionId(),
                            existing.getTransactionStatus(),
                            existing.getTotalDebit(),
                            existing.getCurrency(),
                            debitId,
                            creditId,
                            entryIds,
                            existing.getPostedAt()
                    );
                }
            }
        }

        // 2. Validate currency and positive amounts
        BigDecimal totalDebit = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        BigDecimal totalCredit = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

        for (PostingEntryItem item : entries) {
            if (item.amount() == null || item.amount().compareTo(BigDecimal.ZERO) <= 0) {
                throw LedgerException.badRequest("INVALID_TRANSACTION_AMOUNT", "All ledger posting amounts must be positive");
            }
            BigDecimal scaledAmount = item.amount().setScale(4, RoundingMode.HALF_UP);
            if (item.entryType() == EntryType.DEBIT) {
                totalDebit = totalDebit.add(scaledAmount);
            } else if (item.entryType() == EntryType.CREDIT) {
                totalCredit = totalCredit.add(scaledAmount);
            }
        }

        // 3. Mathematical rule: Sum(Debit) == Sum(Credit)
        if (totalDebit.compareTo(totalCredit) != 0) {
            log.error("Posting rejected: unbalanced journal. Total Debit: {}, Total Credit: {}", totalDebit, totalCredit);
            throw LedgerException.unbalancedPosting(
                    String.format("Unbalanced ledger posting: Total Debit (%s) does not match Total Credit (%s)", totalDebit, totalCredit));
        }

        // 4. Resolve and validate all unique account IDs and sort lexicographically to prevent deadlocks
        List<String> sortedAccountIds = entries.stream()
                .map(PostingEntryItem::accountId)
                .distinct()
                .sorted()
                .toList();

        for (String accId : sortedAccountIds) {
            if (!isSystemAccount(accId)) {
                // Validate account with Account Service
                accountServiceClient.validateAccountEligible(accId, currency);
            }
        }

        // 5. Pessimistic lock snapshots in deterministic sorted order
        Map<String, LedgerBalanceSnapshot> snapshotMap = new HashMap<>();
        for (String accId : sortedAccountIds) {
            LedgerBalanceSnapshot snapshot = snapshotRepository.findWithLockByAccountId(accId)
                    .orElseGet(() -> {
                        LedgerBalanceSnapshot newSnap = new LedgerBalanceSnapshot(
                                UUID.randomUUID(), accId, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, currency);
                        return snapshotRepository.save(newSnap);
                    });
            snapshotMap.put(accId, snapshot);
        }

        // 6. Validate available balances on debit operations from customer accounts
        for (PostingEntryItem item : entries) {
            if (!isSystemAssetAccount(item.accountId()) && item.entryType() == EntryType.DEBIT) {
                LedgerBalanceSnapshot snapshot = snapshotMap.get(item.accountId());
                BigDecimal currentBalance = snapshot.getLedgerBalance();

                if (currentBalance.compareTo(item.amount()) < 0) {
                    log.warn("Insufficient available balance for account {}: requested={}, ledgerBalance={}",
                            item.accountId(), item.amount(), currentBalance);
                    throw LedgerException.insufficientBalance(
                            String.format("Insufficient available balance on account %s. Requested: %s, Available: %s",
                                    item.accountId(), item.amount(), currentBalance));
                }
            }
        }

        // 7. Create and persist LedgerTransaction
        String publicTxId = "TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        LedgerTransaction transaction = new LedgerTransaction();
        transaction.setTransactionId(publicTxId);
        transaction.setTransactionType(transactionType);
        transaction.setTransactionStatus(TransactionStatus.PROCESSING);
        transaction.setReferenceNumber(referenceNumber != null ? referenceNumber : "REF-" + System.currentTimeMillis());
        transaction.setIdempotencyKey(idempotencyKey);
        transaction.setCorrelationId(correlationId);
        transaction.setCurrency(currency);
        transaction.setTotalDebit(totalDebit);
        transaction.setTotalCredit(totalCredit);
        transaction.setNarrative(narrative);
        transaction.setInitiatedBy(initiatedBy != null ? initiatedBy : "SYSTEM");
        transaction.setSourceService(sourceService != null ? sourceService : "LEDGER-SERVICE");
        transaction.setValueDate(LocalDate.now());
        transaction.setInitiatedAt(Instant.now());
        transaction = transactionRepository.save(transaction);

        // 8. Create immutable LedgerEntry records and update Snapshots
        List<String> entryIds = new ArrayList<>();
        String debitEntryId = null;
        String creditEntryId = null;
        Instant now = Instant.now();

        for (PostingEntryItem item : entries) {
            LedgerBalanceSnapshot snapshot = snapshotMap.get(item.accountId());
            BigDecimal amount = item.amount().setScale(4, RoundingMode.HALF_UP);

            String publicEntryId = "LE-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
            LedgerEntry entry = new LedgerEntry(
                    UUID.randomUUID(),
                    publicEntryId,
                    transaction,
                    item.accountId(),
                    item.entryType(),
                    amount,
                    currency,
                    LocalDate.now(),
                    item.narrative() != null ? item.narrative() : narrative,
                    item.referenceNumber() != null ? item.referenceNumber() : transaction.getReferenceNumber()
            );
            entryRepository.save(entry);
            entryIds.add(publicEntryId);

            if (item.entryType() == EntryType.DEBIT) {
                if (debitEntryId == null) debitEntryId = publicEntryId;
                snapshot.setDebitTotal(snapshot.getDebitTotal().add(amount));
            } else {
                if (creditEntryId == null) creditEntryId = publicEntryId;
                snapshot.setCreditTotal(snapshot.getCreditTotal().add(amount));
            }

            // Normal balance calculation:
            // Asset & Expense: Debit - Credit
            // Liability (Customer Deposits), Equity & Revenue: Credit - Debit
            BigDecimal newBalance;
            if (isSystemAssetAccount(item.accountId())) {
                newBalance = snapshot.getDebitTotal().subtract(snapshot.getCreditTotal());
            } else {
                newBalance = snapshot.getCreditTotal().subtract(snapshot.getDebitTotal());
            }
            snapshot.setLedgerBalance(newBalance);
            snapshot.setLastEntryId(entry.getId());
            snapshot.setLastPostedAt(now);
            snapshot.setUpdatedAt(now);
            snapshotRepository.save(snapshot);

            // Outbox event for balance updated
            eventProducer.enqueueEvent(
                    item.accountId(),
                    "AccountBalance",
                    "BALANCE_UPDATED",
                    correlationId,
                    new LedgerEvents.BalanceUpdatedPayload(
                            item.accountId(),
                            newBalance,
                            newBalance,
                            BigDecimal.ZERO,
                            currency,
                            now
                    )
            );
        }

        // 9. Mark transaction as SUCCESS and commit
        transaction.setTransactionStatus(TransactionStatus.SUCCESS);
        transaction.setPostedAt(now);
        transactionRepository.save(transaction);

        // 10. Enqueue TransactionPostedEvent
        eventProducer.enqueueEvent(
                publicTxId,
                "LedgerTransaction",
                "TRANSACTION_POSTED",
                correlationId,
                new LedgerEvents.TransactionPostedPayload(
                        publicTxId,
                        transactionType,
                        totalDebit,
                        currency,
                        debitEntryId,
                        creditEntryId,
                        LocalDate.now(),
                        now
                )
        );

        log.info("Ledger posting committed successfully: txId={}, totalAmount={} {}", publicTxId, totalDebit, currency);

        return new LedgerPostingResponse(
                publicTxId,
                TransactionStatus.SUCCESS,
                totalDebit,
                currency,
                debitEntryId,
                creditEntryId,
                entryIds,
                now
        );
    }

    private boolean isSystemAccount(String accountId) {
        return accountId != null && (
                accountId.startsWith("LA-BANK-") ||
                accountId.startsWith("LA-INTEREST-") ||
                accountId.startsWith("LA-FEE-") ||
                accountId.startsWith("LA-SUSPENSE-") ||
                accountId.startsWith("LA-LOAN-") ||
                accountId.startsWith("SYSTEM-")
        );
    }

    private boolean isSystemAssetAccount(String accountId) {
        return accountId != null && (
                accountId.startsWith("LA-BANK-CASH") ||
                accountId.startsWith("LA-BANK-SETTLEMENT") ||
                accountId.startsWith("LA-BANK-CLEARING") ||
                accountId.startsWith("LA-INTEREST-EXPENSE") ||
                accountId.startsWith("LA-LOAN-PRINCIPAL") ||
                accountId.startsWith("SYSTEM-CASH") ||
                accountId.startsWith("SYSTEM-SETTLEMENT") ||
                accountId.startsWith("SYSTEM-CLEARING") ||
                accountId.startsWith("SYSTEM-INTEREST") ||
                accountId.startsWith("SYSTEM-LOAN-PRINCIPAL")
        );
    }
}
