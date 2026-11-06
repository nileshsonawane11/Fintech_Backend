package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.PlaceHoldRequest;
import com.fintech.ledger.dto.request.ReleaseHoldRequest;
import com.fintech.ledger.dto.response.AccountHoldResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.entity.AccountHold;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.enums.AccountStatus;
import com.fintech.ledger.enums.HoldStatus;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.event.LedgerEvents;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.AccountHoldRepository;
import com.fintech.ledger.repository.LedgerAccountRepository;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class HoldService {

    private static final Logger log = LoggerFactory.getLogger(HoldService.class);

    private final AccountHoldRepository holdRepository;
    private final LedgerAccountRepository accountRepository;
    private final LedgerBalanceSnapshotRepository snapshotRepository;
    private final LedgerEventProducer eventProducer;
    private final IdempotencyService idempotencyService;
    private final AccountServiceClient accountServiceClient;

    public HoldService(AccountHoldRepository holdRepository,
                       LedgerAccountRepository accountRepository,
                       LedgerBalanceSnapshotRepository snapshotRepository,
                       LedgerEventProducer eventProducer,
                       IdempotencyService idempotencyService,
                       AccountServiceClient accountServiceClient) {
        this.holdRepository = holdRepository;
        this.accountRepository = accountRepository;
        this.snapshotRepository = snapshotRepository;
        this.eventProducer = eventProducer;
        this.idempotencyService = idempotencyService;
        this.accountServiceClient = accountServiceClient;
    }

    @Transactional
    public AccountHoldResponse placeHold(String accountId, PlaceHoldRequest request, String createdBy, String idempotencyKey) {
        log.info("Placing financial hold on account {}: amount={}, reason={}", accountId, request.amount(), request.reasonCode());

        // 1. Idempotency check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<AccountHoldResponse> cached = idempotencyService.checkIdempotency(
                    idempotencyKey, "HOLD_PLACE", request, AccountHoldResponse.class);
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        // Check if hold with given holdId already exists (idempotent hold reservation)
        if (request.holdId() != null && !request.holdId().isBlank()) {
            Optional<AccountHold> existing = holdRepository.findByHoldId(request.holdId());
            if (existing.isPresent()) {
                AccountHold hold = existing.get();
                BigDecimal currentActive = holdRepository.sumActiveHoldsByLedgerAccountId(hold.getLedgerAccount().getId());
                BigDecimal available = snapshotRepository.findByLedgerAccount(hold.getLedgerAccount())
                        .map(s -> s.getLedgerBalance().subtract(currentActive))
                        .orElse(BigDecimal.ZERO);
                return mapToResponse(hold, available);
            }
        }

        // 2. Resolve ledger account
        LedgerAccount account = accountRepository.findByAccountReference(accountId)
                .or(() -> accountRepository.findByLedgerAccountId(accountId))
                .orElseThrow(() -> LedgerException.accountNotFound("Ledger account not found: " + accountId));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw LedgerException.inactiveAccount("Cannot place hold on inactive account");
        }

        // 3. Acquire pessimistic lock on balance snapshot
        LedgerBalanceSnapshot snapshot = snapshotRepository.findWithLockByLedgerAccountId(account.getId())
                .orElseGet(() -> {
                    LedgerBalanceSnapshot newSnap = new LedgerBalanceSnapshot(
                            UUID.randomUUID(), account, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, account.getCurrency());
                    return snapshotRepository.save(newSnap);
                });

        // 4. Validate available balance under lock
        BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
        BigDecimal availableBalance = snapshot.getLedgerBalance().subtract(activeHolds);

        if (availableBalance.compareTo(request.amount()) < 0) {
            log.warn("Hold rejected for account {}: requested={}, available={}, ledgerBalance={}",
                    accountId, request.amount(), availableBalance, snapshot.getLedgerBalance());
            throw LedgerException.insufficientBalance(
                    String.format("Insufficient available balance for hold. Requested: %s, Available: %s (Active Holds: %s)",
                            request.amount(), availableBalance, activeHolds));
        }

        // 5. Create AccountHold record
        String publicHoldId = (request.holdId() != null && !request.holdId().isBlank())
                ? request.holdId()
                : "HOLD-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();

        AccountHold hold = new AccountHold(
                UUID.randomUUID(),
                publicHoldId,
                account,
                account.getBankAccountId(),
                account.getCustomerId(),
                request.amount(),
                request.currency() != null ? request.currency() : account.getCurrency(),
                request.reasonCode() != null ? request.reasonCode() : "DISPUTE_INVESTIGATION",
                request.remarks(),
                request.referenceNumber(),
                createdBy != null ? createdBy : "OPS"
        );
        hold = holdRepository.save(hold);

        BigDecimal newAvailableBalance = availableBalance.subtract(request.amount());

        // 6. Enqueue HoldPlacedEvent
        eventProducer.enqueueEvent(
                publicHoldId,
                "AccountHold",
                "HOLD_PLACED",
                UUID.randomUUID().toString(),
                new LedgerEvents.HoldPlacedPayload(
                        publicHoldId,
                        getRef(account),
                        request.amount(),
                        hold.getCurrency(),
                        hold.getReasonCode(),
                        HoldStatus.ACTIVE,
                        hold.getCreatedAt()
                )
        );

        AccountHoldResponse response = mapToResponse(hold, newAvailableBalance);

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyService.recordSuccess(idempotencyKey, hold.getId(), 201, response);
        }

        return response;
    }

    @Transactional
    public AccountHoldResponse releaseHold(String holdId, ReleaseHoldRequest request, String releasedBy) {
        log.info("Releasing financial hold {}: releasedBy={}", holdId, releasedBy);

        AccountHold hold = holdRepository.findByHoldId(holdId)
                .orElseThrow(() -> LedgerException.holdNotFound("Hold not found: " + holdId));

        if (hold.getHoldStatus() == HoldStatus.RELEASED) {
            log.info("Hold {} is already released (idempotent release)", holdId);
            BigDecimal active = holdRepository.sumActiveHoldsByLedgerAccountId(hold.getLedgerAccount().getId());
            BigDecimal avail = snapshotRepository.findByLedgerAccount(hold.getLedgerAccount())
                    .map(s -> s.getLedgerBalance().subtract(active))
                    .orElse(BigDecimal.ZERO);
            return mapToResponse(hold, avail);
        }

        if (hold.getHoldStatus() != HoldStatus.ACTIVE) {
            throw LedgerException.badRequest("INVALID_HOLD_STATE", "Only ACTIVE holds can be released. Current status: " + hold.getHoldStatus());
        }

        hold.setHoldStatus(HoldStatus.RELEASED);
        hold.setReleasedAt(Instant.now());
        hold.setReleasedBy(releasedBy != null ? releasedBy : "OPS");
        if (request != null && request.remarks() != null) {
            hold.setRemarks(request.remarks());
        }
        hold = holdRepository.save(hold);

        BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(hold.getLedgerAccount().getId());
        BigDecimal availableBalance = snapshotRepository.findByLedgerAccount(hold.getLedgerAccount())
                .map(s -> s.getLedgerBalance().subtract(activeHolds))
                .orElse(BigDecimal.ZERO);

        // Enqueue HoldReleasedEvent
        eventProducer.enqueueEvent(
                holdId,
                "AccountHold",
                "HOLD_RELEASED",
                UUID.randomUUID().toString(),
                new LedgerEvents.HoldReleasedPayload(
                        holdId,
                        getRef(hold.getLedgerAccount()),
                        hold.getAmount(),
                        hold.getCurrency(),
                        hold.getReasonCode(),
                        HoldStatus.RELEASED,
                        hold.getReleasedAt()
                )
        );

        return mapToResponse(hold, availableBalance);
    }

    @Transactional(readOnly = true)
    public AccountHoldResponse getHold(String holdId, String customerSubject, boolean isOps) {
        AccountHold hold = holdRepository.findByHoldId(holdId)
                .orElseThrow(() -> LedgerException.holdNotFound("Hold not found: " + holdId));

        if (!isOps && customerSubject != null) {
            if (hold.getCustomerId() != null && !customerSubject.equalsIgnoreCase(hold.getCustomerId().toString())) {
                throw LedgerException.forbidden("Access denied: You do not own this hold");
            }
        }

        BigDecimal active = holdRepository.sumActiveHoldsByLedgerAccountId(hold.getLedgerAccount().getId());
        BigDecimal avail = snapshotRepository.findByLedgerAccount(hold.getLedgerAccount())
                .map(s -> s.getLedgerBalance().subtract(active))
                .orElse(BigDecimal.ZERO);
        return mapToResponse(hold, avail);
    }

    @Transactional(readOnly = true)
    public List<AccountHoldResponse> listAccountHolds(String accountId, String customerSubject, boolean isOps) {
        LedgerAccount account = accountRepository.findByAccountReference(accountId)
                .or(() -> accountRepository.findByLedgerAccountId(accountId))
                .orElseThrow(() -> LedgerException.accountNotFound("Account not found: " + accountId));

        if (!isOps && customerSubject != null) {
            if (account.getCustomerId() != null && !customerSubject.equalsIgnoreCase(account.getCustomerId().toString())) {
                throw LedgerException.forbidden("Access denied: You do not own this account");
            }
        }

        List<AccountHold> holds = holdRepository.findByLedgerAccount_IdAndHoldStatus(account.getId(), HoldStatus.ACTIVE);
        BigDecimal active = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
        BigDecimal avail = snapshotRepository.findByLedgerAccount(account)
                .map(s -> s.getLedgerBalance().subtract(active))
                .orElse(BigDecimal.ZERO);

        List<AccountHoldResponse> list = new ArrayList<>();
        for (AccountHold h : holds) {
            list.add(mapToResponse(h, avail));
        }
        return list;
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<AccountHoldResponse> listOpsHolds(
            String accountId, UUID customerId, HoldStatus status, String reasonCode,
            Instant fromDate, Instant toDate, int limit, String cursor) {

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<AccountHold> holdPage = holdRepository.searchHolds(
                accountId, customerId, status, reasonCode, fromDate, toDate, PageRequest.of(page, limit));

        List<AccountHoldResponse> list = new ArrayList<>();
        for (AccountHold h : holdPage.getContent()) {
            BigDecimal active = holdRepository.sumActiveHoldsByLedgerAccountId(h.getLedgerAccount().getId());
            BigDecimal avail = snapshotRepository.findByLedgerAccount(h.getLedgerAccount())
                    .map(s -> s.getLedgerBalance().subtract(active))
                    .orElse(BigDecimal.ZERO);
            list.add(mapToResponse(h, avail));
        }

        String nextCursor = holdPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(list, nextCursor, holdPage.hasNext(), limit);
    }

    private AccountHoldResponse mapToResponse(AccountHold hold, BigDecimal availableBalance) {
        return new AccountHoldResponse(
                hold.getHoldId(),
                getRef(hold.getLedgerAccount()),
                hold.getAmount(),
                hold.getCurrency(),
                hold.getHoldStatus(),
                availableBalance,
                hold.getReasonCode(),
                hold.getRemarks(),
                hold.getReferenceNumber(),
                hold.getCreatedBy(),
                hold.getReleasedBy(),
                hold.getCreatedAt(),
                hold.getReleasedAt()
        );
    }

    private String getRef(LedgerAccount acc) {
        return acc.getAccountReference() != null ? acc.getAccountReference() : acc.getLedgerAccountId();
    }
}
