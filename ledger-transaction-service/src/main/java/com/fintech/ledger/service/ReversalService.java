package com.fintech.ledger.service;

import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.request.ReverseTransactionRequest;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.dto.response.ReversalResponse;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.entity.TransactionReversal;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.event.LedgerEvents;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerEntryRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
import com.fintech.ledger.repository.TransactionReversalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ReversalService {

    private static final Logger log = LoggerFactory.getLogger(ReversalService.class);

    private final LedgerTransactionRepository transactionRepository;
    private final LedgerEntryRepository entryRepository;
    private final TransactionReversalRepository reversalRepository;
    private final LedgerPostingEngine postingEngine;
    private final LedgerEventProducer eventProducer;

    public ReversalService(LedgerTransactionRepository transactionRepository,
                           LedgerEntryRepository entryRepository,
                           TransactionReversalRepository reversalRepository,
                           LedgerPostingEngine postingEngine,
                           LedgerEventProducer eventProducer) {
        this.transactionRepository = transactionRepository;
        this.entryRepository = entryRepository;
        this.reversalRepository = reversalRepository;
        this.postingEngine = postingEngine;
        this.eventProducer = eventProducer;
    }

    @Transactional
    public ReversalResponse reverseTransaction(String transactionId, ReverseTransactionRequest request,
                                               String opsUser, String idempotencyKey) {
        log.info("Initiating financial reversal of transaction {} by {}: reason={}", transactionId, opsUser, request.reasonCode());

        // 1. Validate original transaction
        LedgerTransaction originalTx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Original transaction not found: " + transactionId));

        if (originalTx.getTransactionStatus() != TransactionStatus.SUCCESS) {
            throw LedgerException.badRequest("TRANSACTION_REVERSAL_NOT_ALLOWED",
                    "Only successfully posted transactions can be reversed. Current status: " + originalTx.getTransactionStatus());
        }

        // 2. Prevent duplicate reversals
        if (reversalRepository.existsByOriginalTransaction_Id(originalTx.getId())) {
            throw LedgerException.conflict("DUPLICATE_REVERSAL", "Transaction has already been reversed: " + transactionId);
        }

        // 3. Fetch original entries
        List<LedgerEntry> originalEntries = entryRepository.findByTransaction_Id(originalTx.getId());
        if (originalEntries.isEmpty()) {
            throw LedgerException.unprocessable("MISSING_LEDGER_ENTRIES", "Original transaction has no financial ledger entries to reverse");
        }

        // 4. Invert entry directions for compensating posting:
        // DEBIT -> CREDIT, CREDIT -> DEBIT
        List<PostingEntryItem> compensatingEntries = new ArrayList<>();
        for (LedgerEntry entry : originalEntries) {
            EntryType invertedType = (entry.getEntryType() == EntryType.DEBIT) ? EntryType.CREDIT : EntryType.DEBIT;
            String narrative = "Reversal of " + originalTx.getTransactionId() + ": " + request.reasonCode();
            compensatingEntries.add(new PostingEntryItem(
                    entry.getLedgerAccount().getLedgerAccountId(),
                    invertedType,
                    entry.getAmount(),
                    narrative,
                    "REV-" + originalTx.getTransactionId()
            ));
        }

        // 5. Post compensating entries atomically
        LedgerPostingResponse postingResponse = postingEngine.post(
                TransactionType.REVERSAL,
                originalTx.getCurrency(),
                UUID.randomUUID().toString(),
                "Reversal of " + originalTx.getTransactionId() + " (" + request.reasonCode() + ")",
                "REV-" + originalTx.getTransactionId(),
                idempotencyKey,
                opsUser,
                "LEDGER-SERVICE",
                compensatingEntries
        );

        LedgerTransaction reversalTx = transactionRepository.findByTransactionId(postingResponse.transactionId())
                .orElseThrow(() -> LedgerException.transactionNotFound("Reversal transaction record missing: " + postingResponse.transactionId()));

        // 6. Record reversal relationship
        TransactionReversal reversalRecord = new TransactionReversal(
                UUID.randomUUID(),
                originalTx,
                reversalTx,
                request.reasonCode(),
                request.remarks(),
                opsUser != null ? opsUser : "OPS"
        );
        reversalRepository.save(reversalRecord);

        // 7. Mark original transaction as REVERSED
        originalTx.setTransactionStatus(TransactionStatus.REVERSED);
        originalTx.setReversedAt(Instant.now());
        transactionRepository.save(originalTx);

        // 8. Enqueue TransactionReversedEvent
        eventProducer.enqueueEvent(
                originalTx.getTransactionId(),
                "LedgerTransaction",
                "TRANSACTION_REVERSED",
                UUID.randomUUID().toString(),
                new LedgerEvents.TransactionReversedPayload(
                        originalTx.getTransactionId(),
                        reversalTx.getTransactionId(),
                        originalTx.getTotalDebit(),
                        originalTx.getCurrency(),
                        request.reasonCode(),
                        opsUser,
                        reversalRecord.getReversedAt()
                )
        );

        log.info("Transaction {} successfully reversed via reversal transaction {}", transactionId, reversalTx.getTransactionId());

        return new ReversalResponse(
                originalTx.getTransactionId(),
                reversalTx.getTransactionId(),
                "SUCCESS",
                request.reasonCode(),
                request.remarks(),
                opsUser,
                reversalRecord.getReversedAt()
        );
    }

    @Transactional(readOnly = true)
    public ReversalResponse getReversalDetails(String transactionId) {
        TransactionReversal reversal = reversalRepository.findByOriginalTransaction_TransactionId(transactionId)
                .or(() -> reversalRepository.findByReversalTransaction_TransactionId(transactionId))
                .orElseThrow(() -> LedgerException.notFound("REVERSAL_NOT_FOUND", "No reversal record found for transaction: " + transactionId));

        return new ReversalResponse(
                reversal.getOriginalTransaction().getTransactionId(),
                reversal.getReversalTransaction().getTransactionId(),
                "SUCCESS",
                reversal.getReasonCode(),
                reversal.getRemarks(),
                reversal.getReversedBy(),
                reversal.getReversedAt()
        );
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<ReversalResponse> listReversals(int limit, String cursor) {
        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<TransactionReversal> pageResult = reversalRepository.findAllByOrderByReversedAtDesc(PageRequest.of(page, limit));
        List<ReversalResponse> list = pageResult.getContent().stream()
                .map(r -> new ReversalResponse(
                        r.getOriginalTransaction().getTransactionId(),
                        r.getReversalTransaction().getTransactionId(),
                        "SUCCESS",
                        r.getReasonCode(),
                        r.getRemarks(),
                        r.getReversedBy(),
                        r.getReversedAt()
                ))
                .toList();

        String nextCursor = pageResult.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(list, nextCursor, pageResult.hasNext(), limit);
    }
}
