package com.fintech.account.service;

import com.fintech.account.client.LedgerServiceClient;
import com.fintech.account.dto.request.AccountLifecycleRequest;
import com.fintech.account.dto.response.LifecycleHistoryResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountLifecycleHistory;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.event.model.AccountEvents.*;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountHoldRepository;
import com.fintech.account.repository.AccountLifecycleHistoryRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.util.AuditLogger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class AccountLifecycleService {

    private final AccountRepository accountRepository;
    private final AccountHoldRepository holdRepository;
    private final AccountLifecycleHistoryRepository historyRepository;
    private final LedgerServiceClient ledgerServiceClient;
    private final OutboxEventService outboxEventService;
    private final IdempotencyService idempotencyService;
    private final AuditLogger auditLogger;

    public AccountLifecycleService(
            AccountRepository accountRepository,
            AccountHoldRepository holdRepository,
            AccountLifecycleHistoryRepository historyRepository,
            LedgerServiceClient ledgerServiceClient,
            OutboxEventService outboxEventService,
            IdempotencyService idempotencyService,
            AuditLogger auditLogger) {
        this.accountRepository = accountRepository;
        this.holdRepository = holdRepository;
        this.historyRepository = historyRepository;
        this.ledgerServiceClient = ledgerServiceClient;
        this.outboxEventService = outboxEventService;
        this.idempotencyService = idempotencyService;
        this.auditLogger = auditLogger;
    }

    @Transactional
    public void freezeAccount(String accountId, AccountLifecycleRequest request, String actor) {
        Account account = getAccountOrThrow(accountId);

        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            throw AccountException.unprocessable("INVALID_STATE_TRANSITION", "Cannot freeze a CLOSED account.");
        }
        if (account.getAccountStatus() == AccountStatus.BLOCKED) {
            throw AccountException.unprocessable("INVALID_STATE_TRANSITION", "Cannot freeze a BLOCKED account.");
        }
        if (account.getAccountStatus() == AccountStatus.FROZEN) {
            return; // idempotent
        }

        AccountStatus previous = account.getAccountStatus();
        account.setAccountStatus(AccountStatus.FROZEN);
        account.setUpdatedBy(actor);
        accountRepository.save(account);

        recordHistory(accountId, previous, AccountStatus.FROZEN, request.reasonCode(), request.remarks(), actor);

        outboxEventService.enqueueEvent(
                accountId,
                "Account",
                "AccountFrozenEvent",
                new AccountFrozenPayload(accountId, request.reasonCode(), request.remarks(), actor, Instant.now())
        );

        auditLogger.logAudit("FREEZE_ACCOUNT", "Account", accountId, actor, "Reason: " + request.reasonCode());
    }

    @Transactional
    public void unfreezeAccount(String accountId, AccountLifecycleRequest request, String actor) {
        Account account = getAccountOrThrow(accountId);

        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            throw AccountException.unprocessable("INVALID_STATE_TRANSITION", "Cannot unfreeze a CLOSED account.");
        }
        if (account.getAccountStatus() == AccountStatus.BLOCKED) {
            throw AccountException.unprocessable("INVALID_STATE_TRANSITION", "Cannot unfreeze a BLOCKED account.");
        }
        if (account.getAccountStatus() == AccountStatus.ACTIVE) {
            return; // idempotent
        }
        if (account.getAccountStatus() != AccountStatus.FROZEN) {
            throw AccountException.unprocessable("INVALID_STATE_TRANSITION",
                    "Cannot unfreeze account in status " + account.getAccountStatus());
        }

        AccountStatus previous = account.getAccountStatus();
        account.setAccountStatus(AccountStatus.ACTIVE);
        account.setUpdatedBy(actor);
        accountRepository.save(account);

        recordHistory(accountId, previous, AccountStatus.ACTIVE, request.reasonCode(), request.remarks(), actor);

        outboxEventService.enqueueEvent(
                accountId,
                "Account",
                "AccountUnfrozenEvent",
                new AccountUnfrozenPayload(accountId, request.reasonCode(), request.remarks(), actor, Instant.now())
        );

        auditLogger.logAudit("UNFREEZE_ACCOUNT", "Account", accountId, actor, "Reason: " + request.reasonCode());
    }

    @Transactional
    public void blockAccount(String accountId, AccountLifecycleRequest request, String actor) {
        Account account = getAccountOrThrow(accountId);

        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            throw AccountException.unprocessable("INVALID_STATE_TRANSITION", "Cannot block a CLOSED account.");
        }
        if (account.getAccountStatus() == AccountStatus.BLOCKED) {
            return; // idempotent
        }

        AccountStatus previous = account.getAccountStatus();
        account.setAccountStatus(AccountStatus.BLOCKED);
        account.setUpdatedBy(actor);
        accountRepository.save(account);

        recordHistory(accountId, previous, AccountStatus.BLOCKED, request.reasonCode(), request.remarks(), actor);

        outboxEventService.enqueueEvent(
                accountId,
                "Account",
                "AccountBlockedEvent",
                new AccountBlockedPayload(accountId, request.reasonCode(), request.remarks(), actor, Instant.now())
        );

        auditLogger.logAudit("BLOCK_ACCOUNT", "Account", accountId, actor, "Reason: " + request.reasonCode());
    }

    public void closeAccount(String accountId, String idempotencyKey, AccountLifecycleRequest request, String actor) {
        idempotencyService.execute(
                idempotencyKey,
                "CLOSE_ACCOUNT",
                request,
                Void.class,
                () -> {
                    executeClose(accountId, request, actor);
                    return null;
                }
        );
    }

    @Transactional
    protected void executeClose(String accountId, AccountLifecycleRequest request, String actor) {
        Account account = getAccountOrThrow(accountId);

        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            return; // idempotent
        }

        // Verify no active holds
        long activeHolds = holdRepository.countByAccountIdAndHoldStatus(accountId, HoldStatus.ACTIVE);
        if (activeHolds > 0) {
            throw AccountException.unprocessable("OUTSTANDING_HOLDS",
                    "Cannot close account: " + activeHolds + " active hold(s) must be released first.");
        }

        // Verify with Ledger Service
        boolean canClose = ledgerServiceClient.verifyZeroObligationsForClosure(accountId);
        if (!canClose) {
            throw AccountException.unprocessable("OUTSTANDING_OBLIGATIONS",
                    "Cannot close account: unresolved financial obligations or non-zero ledger balance.");
        }

        Instant now = Instant.now();
        AccountStatus previous = account.getAccountStatus();
        account.setAccountStatus(AccountStatus.CLOSED);
        account.setClosedAt(now);
        account.setClosureReason(request.reasonCode() + ": " + (request.remarks() != null ? request.remarks() : ""));
        account.setUpdatedBy(actor);
        accountRepository.save(account);

        recordHistory(accountId, previous, AccountStatus.CLOSED, request.reasonCode(), request.remarks(), actor);

        outboxEventService.enqueueEvent(
                accountId,
                "Account",
                "AccountClosedEvent",
                new AccountClosedPayload(accountId, request.reasonCode(), request.remarks(), actor, now)
        );

        auditLogger.logAudit("CLOSE_ACCOUNT", "Account", accountId, actor, "Closed reason: " + request.reasonCode());
    }

    @Transactional(readOnly = true)
    public List<LifecycleHistoryResponse> getLifecycleHistory(String accountId) {
        getAccountOrThrow(accountId);

        return historyRepository.findByAccountIdOrderByChangedAtDesc(accountId).stream()
                .map(h -> new LifecycleHistoryResponse(
                        h.getId(),
                        h.getAccountId(),
                        h.getPreviousStatus(),
                        h.getNewStatus(),
                        h.getReasonCode(),
                        h.getRemarks(),
                        h.getChangedBy(),
                        h.getChangedAt()
                ))
                .toList();
    }

    private Account getAccountOrThrow(String accountId) {
        return accountRepository.findByAccountId(accountId)
                .orElseThrow(() -> AccountException.notFound("Account not found: " + accountId));
    }

    private void recordHistory(String accountId, AccountStatus prev, AccountStatus next,
                              String reasonCode, String remarks, String actor) {
        AccountLifecycleHistory history = new AccountLifecycleHistory(
                accountId, prev, next, reasonCode, remarks, actor
        );
        historyRepository.save(history);
    }
}
