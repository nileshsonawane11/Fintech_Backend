package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountDetailsDto;
import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.response.BalanceHistoryItem;
import com.fintech.ledger.dto.response.BalanceResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.exception.LedgerException;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class BalanceService {

    private static final Logger log = LoggerFactory.getLogger(BalanceService.class);

    private final LedgerBalanceSnapshotRepository snapshotRepository;
    private final LedgerEntryRepository entryRepository;
    private final AccountServiceClient accountServiceClient;

    public BalanceService(LedgerBalanceSnapshotRepository snapshotRepository,
                          LedgerEntryRepository entryRepository,
                          AccountServiceClient accountServiceClient) {
        this.snapshotRepository = snapshotRepository;
        this.entryRepository = entryRepository;
        this.accountServiceClient = accountServiceClient;
    }

    @Transactional(readOnly = true)
    public BalanceResponse getAccountBalance(String accountId, String customerSubject, boolean isOps) {
        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("INVALID_ACCOUNT_ID", "Account ID must not be blank");
        }
        final String finalAccountId = accountId.trim();

        String currency = "INR";
        BigDecimal activeHolds = BigDecimal.ZERO;
        if (!isSystemAccount(finalAccountId)) {
            if (!isOps) {
                accountServiceClient.validateCustomerOwnership(finalAccountId, customerSubject);
            }
            AccountDetailsDto accountDetails = accountServiceClient.getAccount(finalAccountId);
            if (accountDetails != null && accountDetails.currency() != null) {
                currency = accountDetails.currency();
            }
            BigDecimal holdAmount = accountServiceClient.getActiveHoldAmount(finalAccountId);
            if (holdAmount != null) {
                activeHolds = holdAmount;
            }
        }

        final String finalCurrency = currency;
        LedgerBalanceSnapshot snapshot = snapshotRepository.findByAccountId(finalAccountId)
                .orElseGet(() -> computeTransientSnapshot(finalAccountId, finalCurrency));

        BigDecimal ledgerBalance = snapshot.getLedgerBalance() != null ? snapshot.getLedgerBalance() : BigDecimal.ZERO;
        BigDecimal availableBalance = ledgerBalance.subtract(activeHolds);

        return new BalanceResponse(
                finalAccountId,
                ledgerBalance,
                availableBalance,
                activeHolds,
                snapshot.getCurrency() != null ? snapshot.getCurrency() : finalCurrency,
                snapshot.getUpdatedAt() != null ? snapshot.getUpdatedAt() : Instant.now()
        );
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<BalanceHistoryItem> getBalanceHistory(String accountId, String customerSubject,
                                                                    boolean isOps, LocalDate fromDate, LocalDate toDate,
                                                                    int limit, String cursor) {
        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("INVALID_ACCOUNT_ID", "Account ID must not be blank");
        }
        final String finalAccountId = accountId.trim();

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw LedgerException.badRequest("INVALID_DATE_RANGE", "fromDate cannot be after toDate");
        }

        if (limit <= 0) {
            limit = 20;
        } else if (limit > 100) {
            limit = 100;
        }

        String currency = "INR";
        BigDecimal activeHolds = BigDecimal.ZERO;
        if (!isSystemAccount(finalAccountId)) {
            if (!isOps) {
                accountServiceClient.validateCustomerOwnership(finalAccountId, customerSubject);
            }
            AccountDetailsDto accountDetails = accountServiceClient.getAccount(finalAccountId);
            if (accountDetails != null && accountDetails.currency() != null) {
                currency = accountDetails.currency();
            }
            BigDecimal holdAmount = accountServiceClient.getActiveHoldAmount(finalAccountId);
            if (holdAmount != null) {
                activeHolds = holdAmount;
            }
        }

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
                if (page < 0) page = 0;
            } catch (NumberFormatException ignored) {}
        }

        Page<LedgerEntry> entriesPage = entryRepository.findByAccountIdAndDates(
                finalAccountId, fromDate, toDate, PageRequest.of(page, limit));

        List<LedgerEntry> entries = entriesPage.getContent();
        List<BalanceHistoryItem> items = new ArrayList<>();

        if (!entries.isEmpty()) {
            boolean isAsset = isSystemAssetAccount(finalAccountId);
            LedgerEntry newestEntry = entries.get(0);

            BigDecimal debitsUpTo = entryRepository.sumDebitsUpTo(finalAccountId, newestEntry.getCreatedAt());
            BigDecimal creditsUpTo = entryRepository.sumCreditsUpTo(finalAccountId, newestEntry.getCreatedAt());
            if (debitsUpTo == null) debitsUpTo = BigDecimal.ZERO;
            if (creditsUpTo == null) creditsUpTo = BigDecimal.ZERO;

            BigDecimal currentBal = isAsset
                    ? debitsUpTo.subtract(creditsUpTo)
                    : creditsUpTo.subtract(debitsUpTo);

            for (LedgerEntry entry : entries) {
                BigDecimal availableBalance = currentBal.subtract(activeHolds);

                items.add(new BalanceHistoryItem(
                        finalAccountId,
                        entry.getValueDate(),
                        currentBal,
                        availableBalance,
                        activeHolds,
                        entry.getCurrency() != null ? entry.getCurrency() : currency,
                        entry.getReferenceNumber(),
                        entry.getCreatedAt()
                ));

                BigDecimal entryAmount = entry.getAmount() != null ? entry.getAmount().abs() : BigDecimal.ZERO;

                if (isAsset) {
                    if (entry.getEntryType() == EntryType.DEBIT) {
                        currentBal = currentBal.subtract(entryAmount);
                    } else {
                        currentBal = currentBal.add(entryAmount);
                    }
                } else {
                    if (entry.getEntryType() == EntryType.CREDIT) {
                        currentBal = currentBal.subtract(entryAmount);
                    } else {
                        currentBal = currentBal.add(entryAmount);
                    }
                }
            }
        }

        String nextCursor = entriesPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(items, nextCursor, entriesPage.hasNext(), limit);
    }

    @Transactional
    public BalanceResponse rebuildAccountBalanceProjection(String accountId, String initiatedBy) {
        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("INVALID_ACCOUNT_ID", "Account ID must not be blank");
        }
        final String finalAccountId = accountId.trim();

        log.info("Initiating authoritative balance projection rebuild for account {} by {}", finalAccountId, initiatedBy);

        String currency = "INR";
        BigDecimal activeHolds = BigDecimal.ZERO;
        if (!isSystemAccount(finalAccountId)) {
            AccountDetailsDto account = accountServiceClient.getAccount(finalAccountId);
            if (account != null && account.currency() != null) {
                currency = account.currency();
            }
            BigDecimal holdAmount = accountServiceClient.getActiveHoldAmount(finalAccountId);
            if (holdAmount != null) {
                activeHolds = holdAmount;
            }
        }

        final String finalCurrency = currency;
        LedgerBalanceSnapshot snapshot = snapshotRepository.findWithLockByAccountId(finalAccountId)
                .orElseGet(() -> new LedgerBalanceSnapshot(
                        UUID.randomUUID(), finalAccountId, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, finalCurrency));

        BigDecimal totalDebits = entryRepository.sumDebitsByAccountId(finalAccountId);
        BigDecimal totalCredits = entryRepository.sumCreditsByAccountId(finalAccountId);
        if (totalDebits == null) totalDebits = BigDecimal.ZERO;
        if (totalCredits == null) totalCredits = BigDecimal.ZERO;

        BigDecimal calculatedBalance = isSystemAssetAccount(finalAccountId)
                ? totalDebits.subtract(totalCredits)
                : totalCredits.subtract(totalDebits);

        snapshot.setDebitTotal(totalDebits);
        snapshot.setCreditTotal(totalCredits);
        snapshot.setLedgerBalance(calculatedBalance);
        if (snapshot.getCurrency() == null) {
            snapshot.setCurrency(finalCurrency);
        }

        List<LedgerEntry> latestEntries = entryRepository.findLatestByAccountId(finalAccountId, PageRequest.of(0, 1));
        if (!latestEntries.isEmpty()) {
            LedgerEntry latest = latestEntries.get(0);
            snapshot.setLastEntryId(latest.getId());
            snapshot.setLastPostedAt(latest.getCreatedAt());
        } else {
            snapshot.setLastEntryId(null);
            snapshot.setLastPostedAt(null);
        }

        snapshot.setUpdatedAt(Instant.now());
        snapshot = snapshotRepository.save(snapshot);

        BigDecimal availableBalance = calculatedBalance.subtract(activeHolds);

        log.info("Balance projection rebuilt successfully for {}: ledgerBalance={}, availableBalance={}, activeHolds={}, debits={}, credits={}",
                finalAccountId, calculatedBalance, availableBalance, activeHolds, totalDebits, totalCredits);

        return new BalanceResponse(
                finalAccountId,
                calculatedBalance,
                availableBalance,
                activeHolds,
                snapshot.getCurrency() != null ? snapshot.getCurrency() : finalCurrency,
                snapshot.getUpdatedAt()
        );
    }

    public LedgerBalanceSnapshot computeTransientSnapshot(String accountId, String currency) {
        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("INVALID_ACCOUNT_ID", "Account ID must not be blank");
        }
        final String finalAccountId = accountId.trim();

        BigDecimal totalDebits = entryRepository.sumDebitsByAccountId(finalAccountId);
        BigDecimal totalCredits = entryRepository.sumCreditsByAccountId(finalAccountId);
        if (totalDebits == null) totalDebits = BigDecimal.ZERO;
        if (totalCredits == null) totalCredits = BigDecimal.ZERO;

        BigDecimal balance = isSystemAssetAccount(finalAccountId)
                ? totalDebits.subtract(totalCredits)
                : totalCredits.subtract(totalDebits);

        LedgerBalanceSnapshot snapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(),
                finalAccountId,
                totalDebits,
                totalCredits,
                balance,
                currency != null ? currency : "INR"
        );

        List<LedgerEntry> latestEntries = entryRepository.findLatestByAccountId(finalAccountId, PageRequest.of(0, 1));
        if (!latestEntries.isEmpty()) {
            LedgerEntry latest = latestEntries.get(0);
            snapshot.setLastEntryId(latest.getId());
            snapshot.setLastPostedAt(latest.getCreatedAt());
        }

        return snapshot;
    }

    @Transactional
    public LedgerBalanceSnapshot computeAndSaveSnapshot(String accountId, String currency) {
        LedgerBalanceSnapshot snapshot = computeTransientSnapshot(accountId, currency);
        return snapshotRepository.save(snapshot);
    }

    public boolean isSystemAccount(String accountId) {
        if (accountId == null || accountId.isBlank()) {
            return false;
        }
        String normalized = accountId.trim().toUpperCase();
        return normalized.startsWith("LA-BANK-") ||
                normalized.startsWith("LA-INTEREST-") ||
                normalized.startsWith("LA-FEE-") ||
                normalized.startsWith("LA-SUSPENSE-") ||
                normalized.startsWith("SYSTEM-");
    }

    public boolean isSystemAssetAccount(String accountId) {
        if (accountId == null || accountId.isBlank()) {
            return false;
        }
        String normalized = accountId.trim().toUpperCase();
        return normalized.startsWith("LA-BANK-CASH") ||
                normalized.startsWith("LA-BANK-SETTLEMENT") ||
                normalized.startsWith("LA-BANK-CLEARING") ||
                normalized.startsWith("LA-INTEREST-EXPENSE") ||
                normalized.startsWith("SYSTEM-CASH") ||
                normalized.startsWith("SYSTEM-SETTLEMENT") ||
                normalized.startsWith("SYSTEM-CLEARING") ||
                normalized.startsWith("SYSTEM-INTEREST");
    }
}
