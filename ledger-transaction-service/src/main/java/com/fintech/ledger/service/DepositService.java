package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.DepositRequest;
import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.request.RejectActionRequest;
import com.fintech.ledger.dto.request.VerifyDepositRequest;
import com.fintech.ledger.dto.response.DepositResponse;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.DepositMethod;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class DepositService {

    private static final Logger log = LoggerFactory.getLogger(DepositService.class);

    private final LedgerPostingEngine postingEngine;
    private final IdempotencyService idempotencyService;
    private final LedgerAccountRepository accountRepository;
    private final LedgerTransactionRepository transactionRepository;
    private final AccountServiceClient accountServiceClient;

    public DepositService(LedgerPostingEngine postingEngine,
                          IdempotencyService idempotencyService,
                          LedgerAccountRepository accountRepository,
                          LedgerTransactionRepository transactionRepository,
                          AccountServiceClient accountServiceClient) {
        this.postingEngine = postingEngine;
        this.idempotencyService = idempotencyService;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.accountServiceClient = accountServiceClient;
    }

    @Transactional
    public DepositResponse initiateDeposit(DepositRequest request, String customerSubject, String idempotencyKey, String correlationId) {
        log.info("Initiating deposit: account={}, amount={} {}, method={}",
                request.accountId(), request.amount(), request.currency(), request.depositMethod());

        // 1. Idempotency check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<DepositResponse> cached = idempotencyService.checkIdempotency(
                    idempotencyKey, "DEPOSIT", request, DepositResponse.class);
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        // 2. Validate amount
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw LedgerException.badRequest("INVALID_TRANSACTION_AMOUNT", "Deposit amount must be strictly positive");
        }

        // 3. Resolve customer account
        LedgerAccount customerAccount = accountRepository.findByAccountReference(request.accountId())
                .or(() -> accountRepository.findByLedgerAccountId(request.accountId()))
                .orElseThrow(() -> LedgerException.accountNotFound("Customer ledger account not found: " + request.accountId()));

        if (customerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw LedgerException.inactiveAccount("Customer ledger account is not active");
        }

        if (!customerAccount.getCurrency().equalsIgnoreCase(request.currency())) {
            throw LedgerException.currencyMismatch("Currency mismatch between account and deposit currency");
        }

        // 4. Cash and Cheque require authorized operational processing or verified external settlement
        boolean requiresOpsVerification = (request.depositMethod() == DepositMethod.CASH || request.depositMethod() == DepositMethod.CHEQUE);

        if (requiresOpsVerification) {
            String publicTxId = "TXN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
            LedgerTransaction tx = new LedgerTransaction();
            tx.setTransactionId(publicTxId);
            tx.setTransactionType(request.depositMethod() == DepositMethod.CASH ? TransactionType.CASH_DEPOSIT : TransactionType.DEPOSIT);
            tx.setTransactionStatus(TransactionStatus.PENDING);
            tx.setReferenceNumber(request.referenceNumber() != null ? request.referenceNumber() : "DEP-" + System.currentTimeMillis());
            tx.setIdempotencyKey(idempotencyKey);
            tx.setCorrelationId(correlationId);
            tx.setCurrency(request.currency());
            tx.setTotalDebit(request.amount());
            tx.setTotalCredit(request.amount());
            tx.setNarrative("Pending deposit verification: " + request.depositMethod());
            tx.setInitiatedBy(customerSubject != null ? customerSubject : "CUSTOMER");
            tx.setSourceService("LEDGER-SERVICE");
            tx.setValueDate(LocalDate.now());
            tx.setInitiatedAt(Instant.now());
            tx = transactionRepository.save(tx);

            DepositResponse response = new DepositResponse(
                    tx.getTransactionId(),
                    request.accountId(),
                    request.amount(),
                    request.currency(),
                    request.depositMethod(),
                    tx.getReferenceNumber(),
                    TransactionStatus.PENDING,
                    tx.getCreatedAt(),
                    null
            );

            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                idempotencyService.recordSuccess(idempotencyKey, tx.getId(), 202, response);
            }
            return response;
        }

        // Direct bank transfer / initial funding posting:
        // Debit: LA-BANK-SETTLEMENT-INR
        // Credit: Customer Account
        String bankSettlementAccountId = "LA-BANK-SETTLEMENT-" + request.currency();
        String narrative = "Deposit via " + request.depositMethod() + " (" + (request.referenceNumber() != null ? request.referenceNumber() : "") + ")";

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem(bankSettlementAccountId, EntryType.DEBIT, request.amount(), narrative, request.referenceNumber()),
                new PostingEntryItem(customerAccount.getLedgerAccountId(), EntryType.CREDIT, request.amount(), narrative, request.referenceNumber())
        );

        TransactionType txType = request.depositMethod() == DepositMethod.INITIAL_FUNDING
                ? TransactionType.INITIAL_FUNDING : TransactionType.DEPOSIT;

        LedgerPostingResponse postingResponse = postingEngine.post(
                txType,
                request.currency(),
                correlationId != null ? correlationId : UUID.randomUUID().toString(),
                narrative,
                request.referenceNumber(),
                idempotencyKey,
                customerSubject,
                "LEDGER-SERVICE",
                entries
        );

        DepositResponse response = new DepositResponse(
                postingResponse.transactionId(),
                request.accountId(),
                request.amount(),
                request.currency(),
                request.depositMethod(),
                request.referenceNumber(),
                TransactionStatus.SUCCESS,
                postingResponse.postedAt(),
                postingResponse.postedAt()
        );

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyService.recordSuccess(idempotencyKey, null, 201, response);
        }

        return response;
    }

    @Transactional(readOnly = true)
    public DepositResponse getDepositDetails(String transactionId, String customerSubject, boolean isOps) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Deposit transaction not found: " + transactionId));

        return new DepositResponse(
                tx.getTransactionId(),
                tx.getNarrative(),
                tx.getTotalCredit(),
                tx.getCurrency(),
                DepositMethod.BANK_TRANSFER,
                tx.getReferenceNumber(),
                tx.getTransactionStatus(),
                tx.getCreatedAt(),
                tx.getPostedAt()
        );
    }

    @Transactional
    public DepositResponse verifyDeposit(String transactionId, VerifyDepositRequest request, String opsUser) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Deposit transaction not found: " + transactionId));

        if (tx.getTransactionStatus() != TransactionStatus.PENDING) {
            throw LedgerException.badRequest("INVALID_TRANSACTION_STATE",
                    "Only PENDING deposits can be verified. Current status: " + tx.getTransactionStatus());
        }

        // Find customer account from reference number or correlation
        String bankAccountId = tx.getTransactionType() == TransactionType.CASH_DEPOSIT
                ? "LA-BANK-CASH-" + tx.getCurrency() : "LA-BANK-SETTLEMENT-" + tx.getCurrency();

        log.info("Operations user {} verifying deposit {}", opsUser, transactionId);

        tx.setTransactionStatus(TransactionStatus.SUCCESS);
        tx.setPostedAt(Instant.now());
        transactionRepository.save(tx);

        return new DepositResponse(
                tx.getTransactionId(),
                tx.getReferenceNumber(),
                tx.getTotalCredit(),
                tx.getCurrency(),
                DepositMethod.BANK_TRANSFER,
                request != null ? request.externalSettlementRef() : tx.getReferenceNumber(),
                TransactionStatus.SUCCESS,
                tx.getCreatedAt(),
                tx.getPostedAt()
        );
    }

    @Transactional
    public DepositResponse rejectDeposit(String transactionId, RejectActionRequest request, String opsUser) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Deposit transaction not found: " + transactionId));

        if (tx.getTransactionStatus() != TransactionStatus.PENDING) {
            throw LedgerException.badRequest("INVALID_TRANSACTION_STATE",
                    "Only PENDING deposits can be rejected. Current status: " + tx.getTransactionStatus());
        }

        log.info("Operations user {} rejecting deposit {}: reason={}", opsUser, transactionId, request.reason());
        tx.setTransactionStatus(TransactionStatus.FAILED);
        tx.setNarrative(tx.getNarrative() + " [REJECTED: " + request.reason() + "]");
        transactionRepository.save(tx);

        return new DepositResponse(
                tx.getTransactionId(),
                tx.getReferenceNumber(),
                tx.getTotalCredit(),
                tx.getCurrency(),
                DepositMethod.BANK_TRANSFER,
                tx.getReferenceNumber(),
                TransactionStatus.FAILED,
                tx.getCreatedAt(),
                null
        );
    }
}
