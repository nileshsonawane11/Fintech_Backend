package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.TransactionReceiptResponse;
import com.fintech.ledger.dto.response.TransactionResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionDirection;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerEntryRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);

    private final LedgerTransactionRepository transactionRepository;
    private final LedgerEntryRepository entryRepository;
    private final LedgerAccountRepository accountRepository;
    private final AccountServiceClient accountServiceClient;

    public TransactionService(LedgerTransactionRepository transactionRepository,
                              LedgerEntryRepository entryRepository,
                              LedgerAccountRepository accountRepository,
                              AccountServiceClient accountServiceClient) {
        this.transactionRepository = transactionRepository;
        this.entryRepository = entryRepository;
        this.accountRepository = accountRepository;
        this.accountServiceClient = accountServiceClient;
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<TransactionResponse> getAccountTransactions(
            String accountId, String customerSubject, boolean isOps,
            LocalDate fromDate, LocalDate toDate, TransactionType txType,
            TransactionStatus status, TransactionDirection direction,
            BigDecimal minAmount, BigDecimal maxAmount, int limit, String cursor) {

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

        Page<LedgerTransaction> txPage = transactionRepository.findByAccountAndFilters(
                account.getId(), fromDate, toDate, txType, status, minAmount, maxAmount, PageRequest.of(page, limit));

        List<TransactionResponse> responseList = new ArrayList<>();
        for (LedgerTransaction tx : txPage.getContent()) {
            List<LedgerEntry> entries = entryRepository.findByTransaction_Id(tx.getId());
            Optional<LedgerEntry> accountEntry = entries.stream()
                    .filter(e -> e.getLedgerAccount().getId().equals(account.getId()))
                    .findFirst();

            TransactionDirection derivedDirection = accountEntry
                    .map(e -> e.getEntryType() == EntryType.DEBIT ? TransactionDirection.DEBIT : TransactionDirection.CREDIT)
                    .orElse(TransactionDirection.DEBIT);

            if (direction != null && derivedDirection != direction) {
                continue;
            }

            BigDecimal amount = accountEntry.map(LedgerEntry::getAmount).orElse(tx.getTotalDebit());

            responseList.add(new TransactionResponse(
                    tx.getTransactionId(),
                    account.getAccountReference() != null ? account.getAccountReference() : account.getLedgerAccountId(),
                    tx.getTransactionType(),
                    derivedDirection,
                    amount,
                    tx.getCurrency(),
                    tx.getTransactionStatus(),
                    tx.getNarrative(),
                    tx.getReferenceNumber(),
                    tx.getValueDate(),
                    tx.getInitiatedAt(),
                    tx.getPostedAt(),
                    tx.getReversedAt(),
                    tx.getCreatedAt()
            ));
        }

        String nextCursor = txPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(responseList, nextCursor, txPage.hasNext(), limit);
    }

    @Transactional(readOnly = true)
    public TransactionResponse getTransactionDetails(String transactionId, String customerSubject, boolean isOps) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Transaction not found: " + transactionId));

        List<LedgerEntry> entries = entryRepository.findByTransaction_Id(tx.getId());

        if (!isOps && customerSubject != null) {
            boolean ownsAnyEntry = entries.stream().anyMatch(e -> {
                UUID custId = e.getLedgerAccount().getCustomerId();
                return custId != null && customerSubject.equalsIgnoreCase(custId.toString());
            });
            if (!ownsAnyEntry) {
                throw LedgerException.forbidden("Access denied: You do not have permission to view transaction " + transactionId);
            }
        }

        LedgerEntry primaryEntry = entries.isEmpty() ? null : entries.get(0);
        String accountRef = primaryEntry != null
                ? (primaryEntry.getLedgerAccount().getAccountReference() != null ? primaryEntry.getLedgerAccount().getAccountReference() : primaryEntry.getLedgerAccount().getLedgerAccountId())
                : "SYSTEM";
        TransactionDirection direction = (primaryEntry != null && primaryEntry.getEntryType() == EntryType.DEBIT)
                ? TransactionDirection.DEBIT : TransactionDirection.CREDIT;

        return new TransactionResponse(
                tx.getTransactionId(),
                accountRef,
                tx.getTransactionType(),
                direction,
                tx.getTotalDebit(),
                tx.getCurrency(),
                tx.getTransactionStatus(),
                tx.getNarrative(),
                tx.getReferenceNumber(),
                tx.getValueDate(),
                tx.getInitiatedAt(),
                tx.getPostedAt(),
                tx.getReversedAt(),
                tx.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public TransactionReceiptResponse getTransactionReceipt(String transactionId, String customerSubject, boolean isOps) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Transaction not found: " + transactionId));

        if (tx.getTransactionStatus() != TransactionStatus.SUCCESS) {
            throw LedgerException.badRequest("RECEIPT_UNAVAILABLE",
                    "Receipt can only be generated for successfully posted transactions. Current status: " + tx.getTransactionStatus());
        }

        List<LedgerEntry> entries = entryRepository.findByTransaction_Id(tx.getId());

        LedgerEntry sourceEntry = entries.stream().filter(e -> e.getEntryType() == EntryType.DEBIT).findFirst().orElse(null);
        LedgerEntry destEntry = entries.stream().filter(e -> e.getEntryType() == EntryType.CREDIT).findFirst().orElse(null);

        String sourceAcc = sourceEntry != null ? getAccountRef(sourceEntry.getLedgerAccount()) : "SYSTEM";
        String destAcc = destEntry != null ? getAccountRef(destEntry.getLedgerAccount()) : "SYSTEM";

        if (!isOps && customerSubject != null) {
            boolean ownsAccount = (sourceEntry != null && isAccountOwnedBy(sourceEntry.getLedgerAccount(), customerSubject)) ||
                                  (destEntry != null && isAccountOwnedBy(destEntry.getLedgerAccount(), customerSubject));
            if (!ownsAccount) {
                throw LedgerException.forbidden("Access denied: You do not own this transaction receipt");
            }
        }

        String receiptNumber = "RCP-" + tx.getTransactionId().replace("TXN-", "") + "-" + tx.getValueDate().toString().replace("-", "");

        return new TransactionReceiptResponse(
                receiptNumber,
                tx.getTransactionId(),
                tx.getReferenceNumber(),
                sourceAcc,
                destAcc,
                tx.getTransactionType(),
                TransactionDirection.DEBIT,
                tx.getTotalDebit(),
                tx.getCurrency(),
                tx.getNarrative(),
                tx.getTransactionStatus().name(),
                tx.getValueDate(),
                tx.getPostedAt(),
                "FinBank Retail & Core Banking",
                "Automated Financial Core Ledger"
        );
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<TransactionResponse> getCustomerTransactions(
            String customerSubject, String accountId, LocalDate fromDate, LocalDate toDate,
            TransactionType txType, TransactionStatus status, int limit, String cursor) {

        if (customerSubject == null || customerSubject.isBlank()) {
            throw LedgerException.unauthorized("Authentication required");
        }

        UUID customerId;
        try {
            customerId = UUID.fromString(customerSubject);
        } catch (IllegalArgumentException ex) {
            throw LedgerException.unauthorized("Invalid customer subject format");
        }

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<LedgerTransaction> txPage = transactionRepository.findByCustomerAndFilters(
                customerId, accountId, fromDate, toDate, txType, status, PageRequest.of(page, limit));

        List<TransactionResponse> list = new ArrayList<>();
        for (LedgerTransaction tx : txPage.getContent()) {
            list.add(new TransactionResponse(
                    tx.getTransactionId(),
                    accountId != null ? accountId : "ALL",
                    tx.getTransactionType(),
                    TransactionDirection.DEBIT,
                    tx.getTotalDebit(),
                    tx.getCurrency(),
                    tx.getTransactionStatus(),
                    tx.getNarrative(),
                    tx.getReferenceNumber(),
                    tx.getValueDate(),
                    tx.getInitiatedAt(),
                    tx.getPostedAt(),
                    tx.getReversedAt(),
                    tx.getCreatedAt()
            ));
        }

        String nextCursor = txPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(list, nextCursor, txPage.hasNext(), limit);
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<TransactionResponse> searchOperationsTransactions(
            String transactionId, String accountId, UUID customerId, String referenceNumber,
            TransactionType txType, TransactionStatus status, LocalDate fromDate, LocalDate toDate,
            BigDecimal minAmount, BigDecimal maxAmount, int limit, String cursor) {

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<LedgerTransaction> txPage = transactionRepository.searchOperations(
                transactionId, referenceNumber, txType, status, fromDate, toDate, minAmount, maxAmount, PageRequest.of(page, limit));

        List<TransactionResponse> list = new ArrayList<>();
        for (LedgerTransaction tx : txPage.getContent()) {
            list.add(new TransactionResponse(
                    tx.getTransactionId(),
                    accountId != null ? accountId : "N/A",
                    tx.getTransactionType(),
                    TransactionDirection.DEBIT,
                    tx.getTotalDebit(),
                    tx.getCurrency(),
                    tx.getTransactionStatus(),
                    tx.getNarrative(),
                    tx.getReferenceNumber(),
                    tx.getValueDate(),
                    tx.getInitiatedAt(),
                    tx.getPostedAt(),
                    tx.getReversedAt(),
                    tx.getCreatedAt()
            ));
        }

        String nextCursor = txPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(list, nextCursor, txPage.hasNext(), limit);
    }

    private LedgerAccount findAccountOrThrow(String identifier) {
        return accountRepository.findByAccountReference(identifier)
                .or(() -> accountRepository.findByLedgerAccountId(identifier))
                .orElseThrow(() -> LedgerException.ledgerAccountNotFound("No ledger account found for: " + identifier));
    }

    private String getAccountRef(LedgerAccount acc) {
        return acc.getAccountReference() != null ? acc.getAccountReference() : acc.getLedgerAccountId();
    }

    private boolean isAccountOwnedBy(LedgerAccount acc, String customerSubject) {
        if (acc.getCustomerId() != null) {
            return customerSubject.equalsIgnoreCase(acc.getCustomerId().toString());
        }
        return accountServiceClient.verifyAccountOwnership(acc.getAccountReference(), customerSubject);
    }

    private void verifyOwnership(LedgerAccount account, String accountId, String customerSubject) {
        if (!isAccountOwnedBy(account, customerSubject)) {
            throw LedgerException.forbidden("Access denied: You do not own account " + accountId);
        }
    }
}
