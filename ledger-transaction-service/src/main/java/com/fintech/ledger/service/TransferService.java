package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountDetailsDto;
import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.request.TransferRequest;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.dto.response.TransferResponse;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.EntryType;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransferService {

    private static final Logger log = LoggerFactory.getLogger(TransferService.class);

    private final LedgerPostingEngine postingEngine;
    private final IdempotencyService idempotencyService;
    private final LedgerTransactionRepository transactionRepository;
    private final LedgerEntryRepository entryRepository;
    private final AccountServiceClient accountServiceClient;

    public TransferService(LedgerPostingEngine postingEngine,
                           IdempotencyService idempotencyService,
                           LedgerTransactionRepository transactionRepository,
                           LedgerEntryRepository entryRepository,
                           AccountServiceClient accountServiceClient) {
        this.postingEngine = postingEngine;
        this.idempotencyService = idempotencyService;
        this.transactionRepository = transactionRepository;
        this.entryRepository = entryRepository;
        this.accountServiceClient = accountServiceClient;
    }

    @Transactional
    public TransferResponse initiateTransfer(TransferRequest request, String customerSubject, String idempotencyKey, String correlationId) {
        log.info("Initiating transfer: from={}, to={}, amount={} {}, customerSubject={}",
                request.sourceAccountId(), request.destinationAccountId(), request.amount(), request.currency(), customerSubject);

        // 1. Idempotency check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<TransferResponse> cached = idempotencyService.checkIdempotency(
                    idempotencyKey, "TRANSFER", request, TransferResponse.class);
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        // 2. Validate amount
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw LedgerException.badRequest("INVALID_TRANSACTION_AMOUNT", "Transfer amount must be strictly positive");
        }

        if (request.sourceAccountId().equalsIgnoreCase(request.destinationAccountId())) {
            throw LedgerException.badRequest("INVALID_DESTINATION_ACCOUNT", "Source and destination accounts must be distinct");
        }

        // 3. Resolve source account & verify ownership via Account Service
        AccountDetailsDto sourceAccount = accountServiceClient.validateAccountEligible(request.sourceAccountId(), request.currency());

        if (customerSubject != null && !customerSubject.isBlank()) {
            accountServiceClient.validateCustomerOwnership(request.sourceAccountId(), customerSubject);
        }

        // 4. Resolve destination account & verify eligibility via Account Service
        AccountDetailsDto destAccount = accountServiceClient.validateAccountEligible(request.destinationAccountId(), request.currency());

        // 5. Build double-entry posting:
        // Debit: Source Account (reduces Customer liability)
        // Credit: Destination Account (increases Customer liability)
        String narrative = request.remarks() != null && !request.remarks().isBlank()
                ? request.remarks()
                : "Transfer to " + request.destinationAccountId();

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem(request.sourceAccountId(), EntryType.DEBIT, request.amount(), narrative, request.reference()),
                new PostingEntryItem(request.destinationAccountId(), EntryType.CREDIT, request.amount(), narrative, request.reference())
        );

        LedgerPostingResponse postingResponse = postingEngine.post(
                TransactionType.TRANSFER,
                request.currency(),
                correlationId != null ? correlationId : UUID.randomUUID().toString(),
                narrative,
                request.reference(),
                idempotencyKey,
                customerSubject,
                "LEDGER-SERVICE",
                entries
        );

        TransferResponse transferResponse = new TransferResponse(
                postingResponse.transactionId(),
                postingResponse.status(),
                TransactionType.TRANSFER,
                request.amount(),
                request.currency(),
                request.sourceAccountId(),
                request.destinationAccountId(),
                request.reference() != null ? request.reference() : "REF-" + postingResponse.transactionId(),
                postingResponse.postedAt()
        );

        // Record idempotency success
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyService.recordSuccess(idempotencyKey, null, 201, transferResponse);
        }

        return transferResponse;
    }

    @Transactional(readOnly = true)
    public TransferResponse getTransferDetails(String transactionId, String customerSubject, boolean isOps) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Transfer not found: " + transactionId));

        List<LedgerEntry> entries = entryRepository.findByTransaction_Id(tx.getId());
        LedgerEntry source = entries.stream().filter(e -> e.getEntryType() == EntryType.DEBIT).findFirst().orElse(null);
        LedgerEntry dest = entries.stream().filter(e -> e.getEntryType() == EntryType.CREDIT).findFirst().orElse(null);

        String srcRef = source != null ? source.getAccountId() : "UNKNOWN";
        String dstRef = dest != null ? dest.getAccountId() : "UNKNOWN";

        return new TransferResponse(
                tx.getTransactionId(),
                tx.getTransactionStatus(),
                tx.getTransactionType(),
                tx.getTotalDebit(),
                tx.getCurrency(),
                srcRef,
                dstRef,
                tx.getReferenceNumber(),
                tx.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<TransferResponse> listTransfers(String customerSubject, boolean isOps, int limit, String cursor) {
        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<LedgerTransaction> txPage = transactionRepository.findTransfers(PageRequest.of(page, limit));
        List<TransferResponse> list = new ArrayList<>();
        for (LedgerTransaction tx : txPage.getContent()) {
            List<LedgerEntry> entries = entryRepository.findByTransaction_Id(tx.getId());
            LedgerEntry src = entries.stream().filter(e -> e.getEntryType() == EntryType.DEBIT).findFirst().orElse(null);
            LedgerEntry dst = entries.stream().filter(e -> e.getEntryType() == EntryType.CREDIT).findFirst().orElse(null);

            list.add(new TransferResponse(
                    tx.getTransactionId(),
                    tx.getTransactionStatus(),
                    tx.getTransactionType(),
                    tx.getTotalDebit(),
                    tx.getCurrency(),
                    src != null ? src.getAccountId() : "UNKNOWN",
                    dst != null ? dst.getAccountId() : "UNKNOWN",
                    tx.getReferenceNumber(),
                    tx.getCreatedAt()
            ));
        }

        String nextCursor = txPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(list, nextCursor, txPage.hasNext(), limit);
    }

    @Transactional
    public void cancelPendingTransfer(String transactionId, String customerSubject) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Transfer not found: " + transactionId));

        if (tx.getTransactionStatus() == TransactionStatus.SUCCESS) {
            throw LedgerException.badRequest("TRANSFER_ALREADY_POSTED",
                    "A successfully posted transfer cannot be cancelled. Use the transaction reversal workflow.");
        }

        if (tx.getTransactionStatus() != TransactionStatus.INITIATED && tx.getTransactionStatus() != TransactionStatus.PENDING) {
            throw LedgerException.badRequest("INVALID_TRANSACTION_STATE",
                    "Transfer cannot be cancelled in state: " + tx.getTransactionStatus());
        }

        tx.setTransactionStatus(TransactionStatus.CANCELLED);
        transactionRepository.save(tx);
        log.info("Pending transfer {} cancelled", transactionId);
    }
}
