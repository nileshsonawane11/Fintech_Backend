package com.fintech.ledger.service;

import com.fintech.ledger.dto.request.ReconciliationRunRequest;
import com.fintech.ledger.dto.request.ResolveDiscrepancyRequest;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.DiscrepancyResponse;
import com.fintech.ledger.dto.response.ReconciliationRunResponse;
import com.fintech.ledger.entity.*;
import com.fintech.ledger.enums.*;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.event.LedgerEvents;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.*;
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
import java.util.UUID;

@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    private final ReconciliationRunRepository runRepository;
    private final ReconciliationDiscrepancyRepository discrepancyRepository;
    private final LedgerAccountRepository accountRepository;
    private final LedgerBalanceSnapshotRepository snapshotRepository;
    private final LedgerEntryRepository entryRepository;
    private final LedgerTransactionRepository transactionRepository;
    private final AccountHoldRepository holdRepository;
    private final LedgerEventProducer eventProducer;

    public ReconciliationService(ReconciliationRunRepository runRepository,
                                 ReconciliationDiscrepancyRepository discrepancyRepository,
                                 LedgerAccountRepository accountRepository,
                                 LedgerBalanceSnapshotRepository snapshotRepository,
                                 LedgerEntryRepository entryRepository,
                                 LedgerTransactionRepository transactionRepository,
                                 AccountHoldRepository holdRepository,
                                 LedgerEventProducer eventProducer) {
        this.runRepository = runRepository;
        this.discrepancyRepository = discrepancyRepository;
        this.accountRepository = accountRepository;
        this.snapshotRepository = snapshotRepository;
        this.entryRepository = entryRepository;
        this.transactionRepository = transactionRepository;
        this.holdRepository = holdRepository;
        this.eventProducer = eventProducer;
    }

    @Transactional
    public ReconciliationRunResponse triggerReconciliation(ReconciliationRunRequest request, String initiatedBy) {
        String recId = "REC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        log.info("Starting reconciliation run {}: type={}, initiatedBy={}", recId, request.reconciliationType(), initiatedBy);

        ReconciliationRun run = new ReconciliationRun(
                UUID.randomUUID(),
                recId,
                request.reconciliationType(),
                initiatedBy != null ? initiatedBy : "SYSTEM"
        );
        run.setStatus(ReconciliationStatus.RUNNING);
        run = runRepository.save(run);

        int totalAccounts = 0;
        int matchedAccounts = 0;
        int mismatchedAccounts = 0;
        BigDecimal totalDifference = BigDecimal.ZERO;
        List<String> discrepancySummaries = new ArrayList<>();

        // Check 1: System-wide Debits == Credits Check
        BigDecimal systemDebits = entryRepository.sumTotalSystemDebits();
        BigDecimal systemCredits = entryRepository.sumTotalSystemCredits();
        if (systemDebits.compareTo(systemCredits) != 0) {
            BigDecimal diff = systemDebits.subtract(systemCredits).abs();
            totalDifference = totalDifference.add(diff);
            discrepancySummaries.add(String.format("Global trial balance discrepancy: totalDebits=%s, totalCredits=%s, diff=%s",
                    systemDebits, systemCredits, diff));
        }

        // Check 2: Account-by-Account Snapshot Verification
        List<LedgerAccount> accounts = accountRepository.findAll();
        totalAccounts = accounts.size();

        for (LedgerAccount account : accounts) {
            BigDecimal actualDebits = entryRepository.sumDebitsByAccountId(account.getId());
            BigDecimal actualCredits = entryRepository.sumCreditsByAccountId(account.getId());

            BigDecimal expectedBalance;
            if (account.getAccountType() == AccountType.ASSET || account.getAccountType() == AccountType.EXPENSE) {
                expectedBalance = actualDebits.subtract(actualCredits);
            } else {
                expectedBalance = actualCredits.subtract(actualDebits);
            }

            LedgerBalanceSnapshot snapshot = snapshotRepository.findByLedgerAccount(account).orElse(null);
            BigDecimal recordedBalance = snapshot != null ? snapshot.getLedgerBalance() : BigDecimal.ZERO;

            if (expectedBalance.compareTo(recordedBalance) != 0) {
                mismatchedAccounts++;
                BigDecimal diff = expectedBalance.subtract(recordedBalance).abs();
                totalDifference = totalDifference.add(diff);

                ReconciliationDiscrepancy discrepancy = new ReconciliationDiscrepancy(
                        UUID.randomUUID(),
                        run,
                        account,
                        DiscrepancyType.BALANCE_MISMATCH,
                        expectedBalance,
                        recordedBalance,
                        diff,
                        String.format("Snapshot balance (%s) does not match calculated balance (%s) from immutable entries",
                                recordedBalance, expectedBalance)
                );
                discrepancyRepository.save(discrepancy);

                eventProducer.enqueueEvent(
                        recId,
                        "Reconciliation",
                        "RECONCILIATION_DISCREPANCY_DETECTED",
                        UUID.randomUUID().toString(),
                        new LedgerEvents.ReconciliationDiscrepancyDetectedPayload(
                                recId,
                                account.getLedgerAccountId(),
                                DiscrepancyType.BALANCE_MISMATCH.name(),
                                expectedBalance,
                                recordedBalance,
                                diff,
                                Instant.now()
                        )
                );
            } else {
                matchedAccounts++;
            }

            // Check 3: Holds consistency
            if (account.getAccountType() == AccountType.LIABILITY) {
                BigDecimal activeHolds = holdRepository.sumActiveHoldsByLedgerAccountId(account.getId());
                if (activeHolds.compareTo(expectedBalance) > 0) {
                    ReconciliationDiscrepancy disc = new ReconciliationDiscrepancy(
                            UUID.randomUUID(),
                            run,
                            account,
                            DiscrepancyType.HOLD_EXCEEDS_BALANCE,
                            expectedBalance,
                            activeHolds,
                            activeHolds.subtract(expectedBalance),
                            String.format("Active holds (%s) exceed available ledger balance (%s)", activeHolds, expectedBalance)
                    );
                    discrepancyRepository.save(disc);
                }
            }
        }

        run.setStatus(mismatchedAccounts == 0 ? ReconciliationStatus.COMPLETED : ReconciliationStatus.FAILED);
        run.setCompletedAt(Instant.now());
        run.setTotalAccounts(totalAccounts);
        run.setMatchedAccounts(matchedAccounts);
        run.setMismatchedAccounts(mismatchedAccounts);
        run.setDifferenceAmount(totalDifference);
        run.setSummary(String.format("Reconciliation %s finished: %d total accounts, %d matched, %d mismatched. Discrepancies: %s",
                recId, totalAccounts, matchedAccounts, mismatchedAccounts, discrepancySummaries));
        run = runRepository.save(run);

        // Enqueue ReconciliationCompletedEvent
        eventProducer.enqueueEvent(
                recId,
                "Reconciliation",
                "RECONCILIATION_COMPLETED",
                UUID.randomUUID().toString(),
                new LedgerEvents.ReconciliationCompletedPayload(
                        recId,
                        run.getStatus().name(),
                        totalAccounts,
                        matchedAccounts,
                        mismatchedAccounts,
                        totalDifference,
                        run.getCompletedAt()
                )
        );

        log.info("Reconciliation run {} completed with status: {}, mismatched={}", recId, run.getStatus(), mismatchedAccounts);

        return new ReconciliationRunResponse(
                run.getReconciliationId(),
                run.getReconciliationType(),
                run.getStatus(),
                totalAccounts,
                matchedAccounts,
                mismatchedAccounts,
                totalDifference,
                run.getInitiatedBy(),
                run.getSummary(),
                run.getStartedAt(),
                run.getCompletedAt()
        );
    }

    @Transactional(readOnly = true)
    public ReconciliationRunResponse getReconciliationRun(String reconciliationId) {
        ReconciliationRun run = runRepository.findByReconciliationId(reconciliationId)
                .orElseThrow(() -> LedgerException.notFound("RECONCILIATION_NOT_FOUND", "Reconciliation run not found: " + reconciliationId));

        return new ReconciliationRunResponse(
                run.getReconciliationId(),
                run.getReconciliationType(),
                run.getStatus(),
                run.getTotalAccounts(),
                run.getMatchedAccounts(),
                run.getMismatchedAccounts(),
                run.getDifferenceAmount(),
                run.getInitiatedBy(),
                run.getSummary(),
                run.getStartedAt(),
                run.getCompletedAt()
        );
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<ReconciliationRunResponse> listReconciliationRuns(
            ReconciliationStatus status, ReconciliationType type, Instant fromDate, Instant toDate,
            int limit, String cursor) {

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<ReconciliationRun> runs = runRepository.searchRuns(status, type, fromDate, toDate, PageRequest.of(page, limit));
        List<ReconciliationRunResponse> list = runs.getContent().stream()
                .map(r -> new ReconciliationRunResponse(
                        r.getReconciliationId(),
                        r.getReconciliationType(),
                        r.getStatus(),
                        r.getTotalAccounts(),
                        r.getMatchedAccounts(),
                        r.getMismatchedAccounts(),
                        r.getDifferenceAmount(),
                        r.getInitiatedBy(),
                        r.getSummary(),
                        r.getStartedAt(),
                        r.getCompletedAt()
                ))
                .toList();

        String nextCursor = runs.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(list, nextCursor, runs.hasNext(), limit);
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<DiscrepancyResponse> listDiscrepancies(
            String reconciliationId, String accountId, DiscrepancyType type, DiscrepancyStatus status,
            int limit, String cursor) {

        int page = 0;
        if (cursor != null && !cursor.isBlank()) {
            try {
                page = Integer.parseInt(cursor);
            } catch (NumberFormatException ignored) {}
        }

        Page<ReconciliationDiscrepancy> discPage = discrepancyRepository.searchDiscrepancies(
                reconciliationId, accountId, type, status, PageRequest.of(page, limit));

        List<DiscrepancyResponse> list = discPage.getContent().stream()
                .map(d -> new DiscrepancyResponse(
                        d.getId(),
                        d.getReconciliationRun().getReconciliationId(),
                        d.getLedgerAccount().getAccountReference() != null ? d.getLedgerAccount().getAccountReference() : d.getLedgerAccount().getLedgerAccountId(),
                        d.getDiscrepancyType(),
                        d.getExpectedAmount(),
                        d.getActualAmount(),
                        d.getDifferenceAmount(),
                        d.getDescription(),
                        d.getStatus(),
                        d.getCreatedAt(),
                        d.getResolvedAt(),
                        d.getResolvedBy()
                ))
                .toList();

        String nextCursor = discPage.hasNext() ? String.valueOf(page + 1) : null;
        return CursorPagedResponse.of(list, nextCursor, discPage.hasNext(), limit);
    }

    @Transactional(readOnly = true)
    public DiscrepancyResponse getDiscrepancyDetails(UUID discrepancyId) {
        ReconciliationDiscrepancy d = discrepancyRepository.findById(discrepancyId)
                .orElseThrow(() -> LedgerException.notFound("DISCREPANCY_NOT_FOUND", "Discrepancy not found: " + discrepancyId));

        return new DiscrepancyResponse(
                d.getId(),
                d.getReconciliationRun().getReconciliationId(),
                d.getLedgerAccount().getAccountReference() != null ? d.getLedgerAccount().getAccountReference() : d.getLedgerAccount().getLedgerAccountId(),
                d.getDiscrepancyType(),
                d.getExpectedAmount(),
                d.getActualAmount(),
                d.getDifferenceAmount(),
                d.getDescription(),
                d.getStatus(),
                d.getCreatedAt(),
                d.getResolvedAt(),
                d.getResolvedBy()
        );
    }

    @Transactional
    public DiscrepancyResponse resolveDiscrepancy(UUID discrepancyId, ResolveDiscrepancyRequest request, String resolvedBy) {
        ReconciliationDiscrepancy d = discrepancyRepository.findById(discrepancyId)
                .orElseThrow(() -> LedgerException.notFound("DISCREPANCY_NOT_FOUND", "Discrepancy not found: " + discrepancyId));

        if (d.getStatus() == DiscrepancyStatus.RESOLVED) {
            throw LedgerException.badRequest("DISCREPANCY_ALREADY_RESOLVED", "Discrepancy is already resolved");
        }

        d.setStatus(DiscrepancyStatus.RESOLVED);
        d.setResolvedAt(Instant.now());
        d.setResolvedBy(resolvedBy != null ? resolvedBy : "OPS");
        d.setDescription(d.getDescription() + " [RESOLVED (" + request.resolutionCode() + "): " + request.remarks() + "]");
        d = discrepancyRepository.save(d);

        log.info("Discrepancy {} resolved by {} with code {}", discrepancyId, resolvedBy, request.resolutionCode());

        return new DiscrepancyResponse(
                d.getId(),
                d.getReconciliationRun().getReconciliationId(),
                d.getLedgerAccount().getAccountReference() != null ? d.getLedgerAccount().getAccountReference() : d.getLedgerAccount().getLedgerAccountId(),
                d.getDiscrepancyType(),
                d.getExpectedAmount(),
                d.getActualAmount(),
                d.getDifferenceAmount(),
                d.getDescription(),
                d.getStatus(),
                d.getCreatedAt(),
                d.getResolvedAt(),
                d.getResolvedBy()
        );
    }
}
