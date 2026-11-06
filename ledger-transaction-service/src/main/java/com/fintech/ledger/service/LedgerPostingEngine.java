package com.fintech.ledger.service;

import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.entity.*;
import com.fintech.ledger.enums.*;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.event.LedgerEvents;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.*;
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

    private final LedgerAccountRepository accountRepository;
    private final LedgerTransactionRepository transactionRepository;
    private final LedgerEntryRepository entryRepository;
    private final LedgerBalanceSnapshotRepository snapshotRepository;
    private final AccountHoldRepository holdRepository;
    private final LedgerEventProducer eventProducer;

    public LedgerPostingEngine(LedgerAccountRepository accountRepository,
                               LedgerTransactionRepository transactionRepository,
                               LedgerEntryRepository entryRepository,
                               LedgerBalanceSnapshotRepository snapshotRepository,
                               AccountHoldRepository holdRepository,
                               LedgerEventProducer eventProducer) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.entryRepository = entryRepository;
        this.snapshotRepository = snapshotRepository;
        this.holdRepository = holdRepository;
        this.eventProducer = eventProducer;
    }

    /**
     * Executes an atomic, balanced, double-entry financial posting between two or more ledger accounts.
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

        // 4. Resolve all unique ledger accounts and sort lexicographically to prevent deadlocks
        Map<String, LedgerAccount> accountMap = new HashMap<>();
        List<String> sortedAccountIds = entries.stream()
                .map(PostingEntryItem::ledgerAccountId)
                .distinct()
                .sorted()
                .toList();

        for (String accId : sortedAccountIds) {
            LedgerAccount account = accountRepository.findByLedgerAccountId(accId)
                    .or(() -> accountRepository.findByAccountReference(accId))
                    .orElseThrow(() -> LedgerException.ledgerAccountNotFound("Ledger account not found for reference: " + accId));

            if (account.getStatus() != AccountStatus.ACTIVE) {
                throw LedgerException.inactiveAccount(
                        String.format("Ledger account %s is not ACTIVE (current status: %s)", account.getLedgerAccountId(), account.getStatus()));
            }

            if (!account.getCurrency().equalsIgnoreCase(currency)) {
                throw LedgerException.currencyMismatch(
                        String.format("Account %s currency (%s) does not match posting currency (%s)",
                                account.getLedgerAccountId(), account.getCurrency(), currency));
            }

            accountMap.put(accId, account);
            accountMap.put(account.getLedgerAccountId(), account);
            if (account.getAccountReference() != null) {
                accountMap.put(account.getAccountReference(), account);
            }
        }

        // 5. Pessimistic lock snapshots in deterministic sorted order
        Map<UUID, LedgerBalanceSnapshot> snapshotMap = new HashMap<>();
        for (String accId : sortedAccountIds) {
            LedgerAccount account = accountMap.get(accId);
            LedgerBalanceSnapshot snapshot = snapshotRepository.findWithLockByLedgerAccountId(account.getId())
                    .orElseGet(() -> {
                        LedgerBalanceSnapshot newSnap = new LedgerBalanceSnapshot(
                                UUID.randomUUID(), account, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, account.getCurrency());
                        return snapshotRepository.save(newSnap);
                    });
            snapshotMap.put(account.getId(), snapshot);
        }

        // 6. Validate available balances on debit operations from liability (customer deposit) accounts
        for (PostingEntryItem item : entries) {
            LedgerAccount account = accountMap.get(item.ledgerAccountId());
            if (account.getAccountType() == AccountType.LIABILITY && item.entryType() == EntryType.DEBIT) {
                LedgerBalanceSnapshot snapshot = snapshotMap.get(account.getId());
                BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
                BigDecimal availableBalance = snapshot.getLedgerBalance().subtract(activeHolds);

                if (availableBalance.compareTo(item.amount()) < 0) {
                    log.warn("Insufficient available balance for account {}: requested={}, available={}, ledgerBalance={}, activeHolds={}",
                            account.getLedgerAccountId(), item.amount(), availableBalance, snapshot.getLedgerBalance(), activeHolds);
                    throw LedgerException.insufficientBalance(
                            String.format("Insufficient available balance on account %s. Requested: %s, Available: %s (Holds: %s)",
                                    account.getAccountReference() != null ? account.getAccountReference() : account.getLedgerAccountId(),
                                    item.amount(), availableBalance, activeHolds));
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
            LedgerAccount account = accountMap.get(item.ledgerAccountId());
            LedgerBalanceSnapshot snapshot = snapshotMap.get(account.getId());
            BigDecimal amount = item.amount().setScale(4, RoundingMode.HALF_UP);

            String publicEntryId = "LE-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
            LedgerEntry entry = new LedgerEntry(
                    UUID.randomUUID(),
                    publicEntryId,
                    transaction,
                    account,
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

            // Recalculate balance for this account based on normal balance rules:
            // Asset & Expense: Debit - Credit
            // Liability, Equity & Revenue: Credit - Debit
            BigDecimal newBalance;
            if (account.getAccountType() == AccountType.ASSET || account.getAccountType() == AccountType.EXPENSE) {
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
            BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
            BigDecimal available = (account.getAccountType() == AccountType.LIABILITY)
                    ? newBalance.subtract(activeHolds)
                    : newBalance;

            eventProducer.enqueueEvent(
                    account.getLedgerAccountId(),
                    "LedgerAccount",
                    "BALANCE_UPDATED",
                    correlationId,
                    new LedgerEvents.BalanceUpdatedPayload(
                            account.getAccountReference() != null ? account.getAccountReference() : account.getLedgerAccountId(),
                            account.getLedgerAccountId(),
                            newBalance,
                            available,
                            activeHolds,
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
}
