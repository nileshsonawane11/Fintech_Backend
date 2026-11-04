package com.fintech.account.service;

import com.fintech.account.client.LedgerServiceClient;
import com.fintech.account.dto.request.CancelHoldRequest;
import com.fintech.account.dto.request.CreateHoldRequest;
import com.fintech.account.dto.request.ReleaseHoldRequest;
import com.fintech.account.dto.response.AccountHoldResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountHold;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.event.model.AccountEvents.*;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountHoldRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.util.AuditLogger;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
public class AccountHoldService {

    private final AccountHoldRepository holdRepository;
    private final AccountRepository accountRepository;
    private final LedgerServiceClient ledgerServiceClient;
    private final AccountNumberGenerator numberGenerator;
    private final OutboxEventService outboxEventService;
    private final IdempotencyService idempotencyService;
    private final AuditLogger auditLogger;

    public AccountHoldService(
            AccountHoldRepository holdRepository,
            AccountRepository accountRepository,
            LedgerServiceClient ledgerServiceClient,
            AccountNumberGenerator numberGenerator,
            OutboxEventService outboxEventService,
            IdempotencyService idempotencyService,
            AuditLogger auditLogger) {
        this.holdRepository = holdRepository;
        this.accountRepository = accountRepository;
        this.ledgerServiceClient = ledgerServiceClient;
        this.numberGenerator = numberGenerator;
        this.outboxEventService = outboxEventService;
        this.idempotencyService = idempotencyService;
        this.auditLogger = auditLogger;
    }

    public AccountHoldResponse placeHold(String accountId, String idempotencyKey, CreateHoldRequest request, String createdBy) {
        return idempotencyService.execute(
                idempotencyKey,
                "PLACE_HOLD",
                request,
                AccountHoldResponse.class,
                () -> executePlaceHold(accountId, idempotencyKey, request, createdBy)
        );
    }

    @Transactional
    protected AccountHoldResponse executePlaceHold(
            String accountId, String idempotencyKey, CreateHoldRequest request, String createdBy) {

        Account account = accountRepository.findByAccountId(accountId)
                .orElseThrow(() -> AccountException.notFound("Account not found: " + accountId));

        if (account.getAccountStatus() == AccountStatus.CLOSED) {
            throw AccountException.unprocessable("ACCOUNT_CLOSED", "Cannot place hold on a CLOSED account.");
        }
        if (account.getAccountStatus() == AccountStatus.BLOCKED) {
            throw AccountException.unprocessable("ACCOUNT_BLOCKED", "Cannot place hold on a BLOCKED account.");
        }
        if (request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw AccountException.badRequest("Hold amount must be greater than zero.");
        }

        String holdId = numberGenerator.generateHoldId();

        // Coordinate with Ledger Service to reserve the amount
        boolean reserved = ledgerServiceClient.reserveHoldFunds(
                accountId, holdId, request.amount(), account.getCurrency(), idempotencyKey);
        if (!reserved) {
            throw AccountException.unprocessable("HOLD_RESERVATION_FAILED",
                    "Ledger reservation could not be completed for hold " + holdId);
        }

        Instant now = Instant.now();
        AccountHold hold = new AccountHold();
        hold.setHoldId(holdId);
        hold.setAccountId(accountId);
        hold.setAmount(request.amount());
        hold.setCurrency(account.getCurrency());
        hold.setReasonCode(request.reasonCode());
        hold.setRemarks(request.remarks());
        hold.setHoldStatus(HoldStatus.ACTIVE);
        hold.setCreatedBy(createdBy != null ? createdBy : "OPS");
        hold.setCreatedAt(now);

        AccountHold saved = holdRepository.save(hold);

        // Enqueue outbox event
        outboxEventService.enqueueEvent(
                saved.getHoldId(),
                "AccountHold",
                "AccountHoldPlacedEvent",
                new AccountHoldPlacedPayload(
                        saved.getHoldId(),
                        saved.getAccountId(),
                        saved.getAmount(),
                        saved.getCurrency(),
                        saved.getReasonCode(),
                        saved.getHoldStatus(),
                        saved.getCreatedBy(),
                        saved.getCreatedAt()
                )
        );

        auditLogger.logAudit("PLACE_HOLD", "AccountHold", saved.getHoldId(), createdBy,
                "Hold of " + saved.getAmount() + " " + saved.getCurrency() + " placed on " + accountId);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<AccountHoldResponse> listAccountHolds(
            String accountId, HoldStatus status, String cursor, int limit) {
        accountRepository.findByAccountId(accountId)
                .orElseThrow(() -> AccountException.notFound("Account not found: " + accountId));

        int pageSize = (limit <= 0 || limit > 100) ? 20 : limit;
        Slice<AccountHold> slice = holdRepository.findAccountHoldsWithCursor(
                accountId, status, cursor, PageRequest.of(0, pageSize));

        List<AccountHoldResponse> items = slice.getContent().stream()
                .map(this::toResponse)
                .toList();

        String nextCursor = null;
        if (slice.hasNext() && !items.isEmpty()) {
            nextCursor = items.get(items.size() - 1).holdId();
        }

        return CursorPagedResponse.of(items, nextCursor, slice.hasNext(), pageSize);
    }

    @Transactional(readOnly = true)
    public AccountHoldResponse getHoldDetails(String holdId) {
        AccountHold hold = holdRepository.findByHoldId(holdId)
                .orElseThrow(() -> AccountException.notFound("Hold not found: " + holdId));

        return toResponse(hold);
    }

    @Transactional
    public AccountHoldResponse releaseHold(String holdId, ReleaseHoldRequest request, String releasedBy) {
        AccountHold hold = holdRepository.findByHoldId(holdId)
                .orElseThrow(() -> AccountException.notFound("Hold not found: " + holdId));

        if (hold.getHoldStatus() == HoldStatus.RELEASED) {
            return toResponse(hold); // idempotent return
        }

        if (hold.getHoldStatus() != HoldStatus.ACTIVE) {
            throw AccountException.conflict("INVALID_HOLD_STATUS",
                    "Cannot release hold in status " + hold.getHoldStatus());
        }

        // Coordinate with Ledger Service to release reservation
        boolean released = ledgerServiceClient.releaseHoldFunds(
                hold.getAccountId(), hold.getHoldId(), hold.getAmount(), hold.getCurrency());
        if (!released) {
            throw AccountException.unprocessable("HOLD_RELEASE_FAILED",
                    "Ledger Service could not release the reserved funds.");
        }

        Instant now = Instant.now();
        hold.setHoldStatus(HoldStatus.RELEASED);
        hold.setReleasedBy(releasedBy != null ? releasedBy : "OPS");
        hold.setReleasedAt(now);
        hold.setReleaseReason(request.reasonCode() + ": " + (request.remarks() != null ? request.remarks() : ""));
        AccountHold saved = holdRepository.save(hold);

        outboxEventService.enqueueEvent(
                saved.getHoldId(),
                "AccountHold",
                "AccountHoldReleasedEvent",
                new AccountHoldReleasedPayload(
                        saved.getHoldId(),
                        saved.getAccountId(),
                        saved.getAmount(),
                        saved.getCurrency(),
                        saved.getReasonCode(),
                        saved.getHoldStatus(),
                        saved.getReleasedBy(),
                        saved.getReleasedAt()
                )
        );

        auditLogger.logAudit("RELEASE_HOLD", "AccountHold", saved.getHoldId(), releasedBy,
                "Hold released for reason: " + request.reasonCode());

        return toResponse(saved);
    }

    @Transactional
    public void cancelHold(String holdId, CancelHoldRequest request, String cancelledBy) {
        AccountHold hold = holdRepository.findByHoldId(holdId)
                .orElseThrow(() -> AccountException.notFound("Hold not found: " + holdId));

        if (hold.getHoldStatus() == HoldStatus.CANCELLED) {
            return; // idempotent
        }

        if (hold.getHoldStatus() != HoldStatus.ACTIVE) {
            throw AccountException.unprocessable("INVALID_HOLD_STATUS",
                    "Cannot cancel hold in status " + hold.getHoldStatus());
        }

        // Release ledger reservation if active
        ledgerServiceClient.releaseHoldFunds(hold.getAccountId(), hold.getHoldId(), hold.getAmount(), hold.getCurrency());

        hold.setHoldStatus(HoldStatus.CANCELLED);
        hold.setReleasedBy(cancelledBy);
        hold.setReleasedAt(Instant.now());
        hold.setReleaseReason("CANCELLED: " + (request.remarks() != null ? request.remarks() : ""));
        holdRepository.save(hold);

        auditLogger.logAudit("CANCEL_HOLD", "AccountHold", holdId, cancelledBy, "Cancelled hold: " + request.remarks());
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<AccountHoldResponse> listOpsHolds(
            String accountId, String customerId, HoldStatus status, String reasonCode,
            Instant fromDate, Instant toDate, String cursor, int limit) {
        int pageSize = (limit <= 0 || limit > 100) ? 20 : limit;
        Slice<AccountHold> slice = holdRepository.findOpsHoldsWithCursor(
                accountId, status, reasonCode, fromDate, toDate, cursor, PageRequest.of(0, pageSize));

        List<AccountHoldResponse> items = slice.getContent().stream()
                .map(this::toResponse)
                .toList();

        String nextCursor = null;
        if (slice.hasNext() && !items.isEmpty()) {
            nextCursor = items.get(items.size() - 1).holdId();
        }

        return CursorPagedResponse.of(items, nextCursor, slice.hasNext(), pageSize);
    }

    private AccountHoldResponse toResponse(AccountHold hold) {
        return new AccountHoldResponse(
                hold.getHoldId(),
                hold.getAccountId(),
                hold.getAmount(),
                hold.getCurrency(),
                hold.getReasonCode(),
                hold.getHoldStatus(),
                hold.getRemarks(),
                hold.getCreatedBy(),
                hold.getReleasedBy(),
                hold.getCreatedAt(),
                hold.getReleasedAt(),
                hold.getReleaseReason()
        );
    }
}
