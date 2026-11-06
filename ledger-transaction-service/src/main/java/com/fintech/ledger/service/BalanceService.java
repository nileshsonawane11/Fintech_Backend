package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.response.BalanceHistoryItem;
import com.fintech.ledger.dto.response.BalanceResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.enums.AccountType;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.AccountHoldRepository;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import com.fintech.ledger.repository.LedgerEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class BalanceService {

    private static final Logger log = LoggerFactory.getLogger(BalanceService.class);

    private final LedgerAccountRepository accountRepository;
    private final LedgerBalanceSnapshotRepository snapshotRepository;
    private final AccountHoldRepository holdRepository;
    private final LedgerEntryRepository entryRepository;
    private final AccountServiceClient accountServiceClient;

    public BalanceService(LedgerAccountRepository accountRepository,
                          LedgerBalanceSnapshotRepository snapshotRepository,
                          AccountHoldRepository holdRepository,
                          LedgerEntryRepository entryRepository,
                          AccountServiceClient accountServiceClient) {
        this.accountRepository = accountRepository;
        this.snapshotRepository = snapshotRepository;
        this.holdRepository = holdRepository;
        this.entryRepository = entryRepository;
        this.accountServiceClient = accountServiceClient;
    }

    @Transactional(readOnly = true)
    public BalanceResponse getAccountBalance(String accountId, String customerSubject, boolean isOps) {
        LedgerAccount account = findAccountOrThrow(accountId);

        if (!isOps) {
            verifyOwnership(account, accountId, customerSubject);
        }

        LedgerBalanceSnapshot snapshot = snapshotRepository.findByLedgerAccount(account)
                .orElseGet(() -> computeAndSaveSnapshot(account));

        BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
        BigDecimal ledgerBalance = snapshot.getLedgerBalance();
        BigDecimal availableBalance = (account.getAccountType() == AccountType.LIABILITY)
                ? ledgerBalance.subtract(activeHolds)
                : ledgerBalance;

        return new BalanceResponse(
                account.getAccountReference() != null ? account.getAccountReference() : account.getLedgerAccountId(),
                ledgerBalance,
                availableBalance,
                activeHolds,
                account.getCurrency(),
                snapshot.getUpdatedAt() != null ? snapshot.getUpdatedAt() : Instant.now()
        );
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<BalanceHistoryItem> getBalanceHistory(String accountId, String customerSubject,
                                                                    boolean isOps, LocalDate fromDate, LocalDate toDate,
                                                                    int limit, String cursor) {
        LedgerAccount account = findAccountOrThrow(accountId);

        if (!isOps) {
            verifyOwnership(account, accountId, customerSubject);
        }

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<LedgerEntry> entriesPage = entryRepository.findByLedgerAccountIdAndDates(
                account.getLedgerAccountId(), fromDate, toDate, PageRequest.of(page, limit));

        List<BalanceHistoryItem> items = new ArrayList<>();
        BigDecimal runningDebit = BigDecimal.ZERO;
        BigDecimal runningCredit = BigDecimal.ZERO;

        for (LedgerEntry entry : entriesPage.getContent()) {
            if (entry.getEntryType() == EntryType.DEBIT) {
                runningDebit = runningDebit.add(entry.getAmount());
            } else {
                runningCredit = runningCredit.add(entry.getAmount());
            }
            BigDecimal currentLedgerBal = (account.getAccountType() == AccountType.ASSET || account.getAccountType() == AccountType.EXPENSE)
                    ? runningDebit.subtract(runningCredit)
                    : runningCredit.subtract(runningDebit);

            BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
            BigDecimal currentAvailable = currentLedgerBal.subtract(activeHolds);

            items.add(new BalanceHistoryItem(
                    account.getAccountReference() != null ? account.getAccountReference() : account.getLedgerAccountId(),
                    entry.getValueDate(),
                    currentLedgerBal,
                    currentAvailable,
                    activeHolds,
                    entry.getCurrency(),
                    entry.getReferenceNumber(),
                    entry.getCreatedAt()
            ));
        }

        String nextCursor = entriesPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(items, nextCursor, entriesPage.hasNext(), limit);
    }

    @Transactional(readOnly = true)
    public List<BalanceResponse> getMyAccountBalances(String customerSubject) {
        if (customerSubject == null || customerSubject.isBlank()) {
            throw LedgerException.unauthorized("Authentication subject required");
        }

        UUID customerId = null;
        try {
            customerId = UUID.fromString(customerSubject);
        } catch (IllegalArgumentException ignored) {}

        List<LedgerAccount> accounts;
        if (customerId != null) {
            accounts = accountRepository.findByCustomerId(customerId);
        } else {
            accounts = Collections.emptyList();
        }

        List<BalanceResponse> responses = new ArrayList<>();
        for (LedgerAccount account : accounts) {
            LedgerBalanceSnapshot snapshot = snapshotRepository.findByLedgerAccount(account)
                    .orElseGet(() -> computeAndSaveSnapshot(account));
            BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
            BigDecimal ledgerBalance = snapshot.getLedgerBalance();
            BigDecimal available = ledgerBalance.subtract(activeHolds);

            responses.add(new BalanceResponse(
                    account.getAccountReference() != null ? account.getAccountReference() : account.getLedgerAccountId(),
                    ledgerBalance,
                    available,
                    activeHolds,
                    account.getCurrency(),
                    snapshot.getUpdatedAt() != null ? snapshot.getUpdatedAt() : Instant.now()
            ));
        }
        return responses;
    }

    @Transactional
    public BalanceResponse rebuildAccountBalanceProjection(String ledgerAccountId, String initiatedBy) {
        LedgerAccount account = findAccountOrThrow(ledgerAccountId);

        log.info("Initiating authoritative balance projection rebuild for account {} by {}", account.getLedgerAccountId(), initiatedBy);

        // Lock snapshot
        LedgerBalanceSnapshot snapshot = snapshotRepository.findWithLockByLedgerAccountId(account.getId())
                .orElseGet(() -> new LedgerBalanceSnapshot(
                        UUID.randomUUID(), account, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, account.getCurrency()));

        // Authoritative recalculation from immutable entries
        BigDecimal totalDebits = entryRepository.sumDebitsByAccountId(account.getId());
        BigDecimal totalCredits = entryRepository.sumCreditsByAccountId(account.getId());

        BigDecimal calculatedBalance;
        if (account.getAccountType() == AccountType.ASSET || account.getAccountType() == AccountType.EXPENSE) {
            calculatedBalance = totalDebits.subtract(totalCredits);
        } else {
            calculatedBalance = totalCredits.subtract(totalDebits);
        }

        snapshot.setDebitTotal(totalDebits);
        snapshot.setCreditTotal(totalCredits);
        snapshot.setLedgerBalance(calculatedBalance);
        snapshot.setUpdatedAt(Instant.now());
        snapshotRepository.save(snapshot);

        BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
        BigDecimal available = (account.getAccountType() == AccountType.LIABILITY)
                ? calculatedBalance.subtract(activeHolds)
                : calculatedBalance;

        log.info("Balance projection rebuilt successfully for {}: ledgerBalance={}, debits={}, credits={}",
                account.getLedgerAccountId(), calculatedBalance, totalDebits, totalCredits);

        return new BalanceResponse(
                account.getAccountReference() != null ? account.getAccountReference() : account.getLedgerAccountId(),
                calculatedBalance,
                available,
                activeHolds,
                account.getCurrency(),
                snapshot.getUpdatedAt()
        );
    }

    private LedgerAccount findAccountOrThrow(String identifier) {
        return accountRepository.findByAccountReference(identifier)
                .or(() -> accountRepository.findByLedgerAccountId(identifier))
                .orElseThrow(() -> LedgerException.ledgerAccountNotFound("No ledger account found for: " + identifier));
    }

    private void verifyOwnership(LedgerAccount account, String accountId, String customerSubject) {
        if (account.getCustomerId() != null && customerSubject != null) {
            if (!customerSubject.equalsIgnoreCase(account.getCustomerId().toString())) {
                log.warn("Ownership mismatch: account customerId={}, authSubject={}", account.getCustomerId(), customerSubject);
                throw LedgerException.forbidden("Access denied: You do not own account " + accountId);
            }
        } else {
            boolean isOwner = accountServiceClient.verifyAccountOwnership(accountId, customerSubject);
            if (!isOwner) {
                log.warn("AccountServiceClient reported ownership mismatch for account {} and subject {}", accountId, customerSubject);
                throw LedgerException.forbidden("Access denied: You do not own account " + accountId);
            }
        }
    }

    @Transactional
    public LedgerBalanceSnapshot computeAndSaveSnapshot(LedgerAccount account) {
        BigDecimal totalDebits = entryRepository.sumDebitsByAccountId(account.getId());
        BigDecimal totalCredits = entryRepository.sumCreditsByAccountId(account.getId());

        BigDecimal balance;
        if (account.getAccountType() == AccountType.ASSET || account.getAccountType() == AccountType.EXPENSE) {
            balance = totalDebits.subtract(totalCredits);
        } else {
            balance = totalCredits.subtract(totalDebits);
        }

        LedgerBalanceSnapshot snapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(), account, totalDebits, totalCredits, balance, account.getCurrency());
        return snapshotRepository.save(snapshot);
    }
}
