package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.ApproveWithdrawalRequest;
import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.request.RejectActionRequest;
import com.fintech.ledger.dto.request.WithdrawalRequest;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.dto.response.WithdrawalResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.enums.WithdrawalMethod;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class WithdrawalService {

    private static final Logger log = LoggerFactory.getLogger(WithdrawalService.class);

    private final LedgerPostingEngine postingEngine;
    private final IdempotencyService idempotencyService;
    private final LedgerAccountRepository accountRepository;
    private final LedgerTransactionRepository transactionRepository;
    private final AccountServiceClient accountServiceClient;

    public WithdrawalService(LedgerPostingEngine postingEngine,
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
    public WithdrawalResponse initiateWithdrawal(WithdrawalRequest request, String customerSubject, String idempotencyKey, String correlationId) {
        log.info("Initiating withdrawal: account={}, amount={} {}, method={}",
                request.accountId(), request.amount(), request.currency(), request.withdrawalMethod());

        // 1. Idempotency check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<WithdrawalResponse> cached = idempotencyService.checkIdempotency(
                    idempotencyKey, "WITHDRAWAL", request, WithdrawalResponse.class);
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        // 2. Validate amount
        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw LedgerException.badRequest("INVALID_TRANSACTION_AMOUNT", "Withdrawal amount must be strictly positive");
        }

        // 3. Resolve customer account & verify ownership
        LedgerAccount customerAccount = accountRepository.findByAccountReference(request.accountId())
                .or(() -> accountRepository.findByLedgerAccountId(request.accountId()))
                .orElseThrow(() -> LedgerException.accountNotFound("Customer ledger account not found: " + request.accountId()));

        if (customerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw LedgerException.inactiveAccount("Customer ledger account is not active");
        }

        if (customerSubject != null) {
            boolean owns = customerAccount.getCustomerId() != null
                    ? customerSubject.equalsIgnoreCase(customerAccount.getCustomerId().toString())
                    : accountServiceClient.verifyAccountOwnership(customerAccount.getAccountReference(), customerSubject);
            if (!owns) {
                throw LedgerException.forbidden("Access denied: You do not own account " + request.accountId());
            }
        }

        // 4. Double-entry posting:
        // Debit: Customer Account (reduces liability)
        // Credit: Bank Cash / Settlement
        String targetBankAccountId = (request.withdrawalMethod() == WithdrawalMethod.ATM || request.withdrawalMethod() == WithdrawalMethod.CASH)
                ? "LA-BANK-CASH-" + request.currency()
                : "LA-BANK-SETTLEMENT-" + request.currency();

        String narrative = request.remarks() != null && !request.remarks().isBlank()
                ? request.remarks()
                : "Withdrawal via " + request.withdrawalMethod();

        String referenceNumber = "WDL-" + System.currentTimeMillis();

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem(customerAccount.getLedgerAccountId(), EntryType.DEBIT, request.amount(), narrative, referenceNumber),
                new PostingEntryItem(targetBankAccountId, EntryType.CREDIT, request.amount(), narrative, referenceNumber)
        );

        TransactionType txType = (request.withdrawalMethod() == WithdrawalMethod.ATM || request.withdrawalMethod() == WithdrawalMethod.CASH)
                ? TransactionType.CASH_WITHDRAWAL : TransactionType.WITHDRAWAL;

        LedgerPostingResponse postingResponse = postingEngine.post(
                txType,
                request.currency(),
                correlationId != null ? correlationId : UUID.randomUUID().toString(),
                narrative,
                referenceNumber,
                idempotencyKey,
                customerSubject,
                "LEDGER-SERVICE",
                entries
        );

        WithdrawalResponse response = new WithdrawalResponse(
                postingResponse.transactionId(),
                request.accountId(),
                request.amount(),
                request.currency(),
                request.withdrawalMethod(),
                referenceNumber,
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
    public WithdrawalResponse getWithdrawalDetails(String transactionId, String customerSubject, boolean isOps) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Withdrawal transaction not found: " + transactionId));

        return new WithdrawalResponse(
                tx.getTransactionId(),
                tx.getNarrative(),
                tx.getTotalDebit(),
                tx.getCurrency(),
                WithdrawalMethod.BANK_TRANSFER,
                tx.getReferenceNumber(),
                tx.getTransactionStatus(),
                tx.getCreatedAt(),
                tx.getPostedAt()
        );
    }

    @Transactional
    public WithdrawalResponse approveWithdrawal(String transactionId, ApproveWithdrawalRequest request, String opsUser) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Withdrawal transaction not found: " + transactionId));

        log.info("Operations user {} approved withdrawal {}", opsUser, transactionId);
        tx.setTransactionStatus(TransactionStatus.SUCCESS);
        tx.setPostedAt(java.time.Instant.now());
        transactionRepository.save(tx);

        return new WithdrawalResponse(
                tx.getTransactionId(),
                tx.getReferenceNumber(),
                tx.getTotalDebit(),
                tx.getCurrency(),
                WithdrawalMethod.BANK_TRANSFER,
                request != null ? request.externalPaymentRef() : tx.getReferenceNumber(),
                TransactionStatus.SUCCESS,
                tx.getCreatedAt(),
                tx.getPostedAt()
        );
    }

    @Transactional
    public WithdrawalResponse rejectWithdrawal(String transactionId, RejectActionRequest request, String opsUser) {
        LedgerTransaction tx = transactionRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> LedgerException.transactionNotFound("Withdrawal transaction not found: " + transactionId));

        log.info("Operations user {} rejected withdrawal {}: reason={}", opsUser, transactionId, request.reason());
        tx.setTransactionStatus(TransactionStatus.FAILED);
        tx.setNarrative(tx.getNarrative() + " [REJECTED: " + request.reason() + "]");
        transactionRepository.save(tx);

        return new WithdrawalResponse(
                tx.getTransactionId(),
                tx.getReferenceNumber(),
                tx.getTotalDebit(),
                tx.getCurrency(),
                WithdrawalMethod.BANK_TRANSFER,
                tx.getReferenceNumber(),
                TransactionStatus.FAILED,
                tx.getCreatedAt(),
                null
        );
    }
}
