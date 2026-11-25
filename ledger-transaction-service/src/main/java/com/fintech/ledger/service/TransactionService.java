package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.LedgerEntryResponse;
import com.fintech.ledger.dto.response.TransactionReceiptResponse;
import com.fintech.ledger.dto.response.TransactionResponse;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionDirection;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.exception.LedgerException;
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
    private final AccountServiceClient accountServiceClient;

    public TransactionService(LedgerTransactionRepository transactionRepository,
                              LedgerEntryRepository entryRepository,
                              AccountServiceClient accountServiceClient) {
        this.transactionRepository = transactionRepository;
        this.entryRepository = entryRepository;
        this.accountServiceClient = accountServiceClient;
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<TransactionResponse> getAccountTransactions(
            String accountId, String customerSubject, boolean isOps,
            LocalDate fromDate, LocalDate toDate, TransactionType txType,
            TransactionStatus status, TransactionDirection direction,
            BigDecimal minAmount, BigDecimal maxAmount, int limit, String cursor) {

        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("INVALID_ACCOUNT_ID", "Account ID must not be blank");
        }

        if (!isOps && !isSystemAccount(accountId)) {
            accountServiceClient.validateCustomerOwnership(accountId, customerSubject);
        }

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<LedgerTransaction> txPage = transactionRepository.findByAccountAndFilters(
                accountId, fromDate, toDate, txType, status, minAmount, maxAmount, PageRequest.of(page, limit));

        List<TransactionResponse> responseList = new ArrayList<>();
        for (LedgerTransaction tx : txPage.getContent()) {
            List<LedgerEntry> entries = entryRepository.findByTransaction_Id(tx.getId());
            Optional<LedgerEntry> accountEntry = entries.stream()
                    .filter(e -> accountId.equalsIgnoreCase(e.getAccountId()))
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
                    accountId,
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

        if (!isOps && customerSubject != null && !customerSubject.isBlank()) {
            boolean ownsAny = entries.stream()
                    .filter(e -> !isSystemAccount(e.getAccountId()))
                    .anyMatch(e -> accountServiceClient.verifyAccountOwnership(e.getAccountId(), customerSubject));

            if (!ownsAny) {
                throw LedgerException.forbidden("Access denied: You do not have permission to view transaction " + transactionId);
            }
        }

        LedgerEntry primaryEntry = entries.isEmpty() ? null : entries.get(0);
        String accountRef = primaryEntry != null ? primaryEntry.getAccountId() : "SYSTEM";
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

        String sourceAcc = sourceEntry != null ? sourceEntry.getAccountId() : "SYSTEM";
        String destAcc = destEntry != null ? destEntry.getAccountId() : "SYSTEM";

        if (!isOps && customerSubject != null && !customerSubject.isBlank()) {
            boolean ownsSource = sourceEntry != null && !isSystemAccount(sourceAcc) &&
                    accountServiceClient.verifyAccountOwnership(sourceAcc, customerSubject);
            boolean ownsDest = destEntry != null && !isSystemAccount(destAcc) &&
                    accountServiceClient.verifyAccountOwnership(destAcc, customerSubject);

            if (!ownsSource && !ownsDest) {
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

        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("ACCOUNT_ID_REQUIRED", "Account ID is required to query transactions");
        }

        return getAccountTransactions(accountId, customerSubject, false, fromDate, toDate, txType, status, null, null, null, limit, cursor);
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
                transactionId, accountId, referenceNumber, txType, status, fromDate, toDate, minAmount, maxAmount, PageRequest.of(page, limit));

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

    @Transactional(readOnly = true)
    public CursorPagedResponse<LedgerEntryResponse> getAccountEntries(
            String accountId, LocalDate fromDate, LocalDate toDate, int limit, String cursor) {

        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("INVALID_ACCOUNT_ID", "Account ID must not be blank");
        }

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<LedgerEntry> entriesPage = entryRepository.findByAccountIdAndDates(
                accountId, fromDate, toDate, PageRequest.of(page, limit));

        List<LedgerEntryResponse> dtoList = entriesPage.getContent().stream()
                .map(LedgerEntryResponse::fromEntity)
                .toList();

        String nextCursor = entriesPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(dtoList, nextCursor, entriesPage.hasNext(), limit);
    }

    private boolean isSystemAccount(String accountId) {
        return accountId != null && (
                accountId.startsWith("LA-BANK-") ||
                accountId.startsWith("LA-INTEREST-") ||
                accountId.startsWith("LA-FEE-") ||
                accountId.startsWith("LA-SUSPENSE-") ||
                accountId.startsWith("SYSTEM-")
        );
    }
}
