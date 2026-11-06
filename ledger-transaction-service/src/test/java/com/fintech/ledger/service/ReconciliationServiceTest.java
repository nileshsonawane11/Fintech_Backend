package com.fintech.ledger.service;

import com.fintech.ledger.dto.request.ReconciliationRunRequest;
import com.fintech.ledger.dto.request.ResolveDiscrepancyRequest;
import com.fintech.ledger.dto.response.DiscrepancyResponse;
import com.fintech.ledger.dto.response.ReconciliationRunResponse;
import com.fintech.ledger.entity.*;
import com.fintech.ledger.enums.*;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock
    private ReconciliationRunRepository runRepository;

    @Mock
    private ReconciliationDiscrepancyRepository discrepancyRepository;

    @Mock
    private LedgerAccountRepository accountRepository;

    @Mock
    private LedgerBalanceSnapshotRepository snapshotRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private LedgerTransactionRepository transactionRepository;

    @Mock
    private AccountHoldRepository holdRepository;

    @Mock
    private LedgerEventProducer eventProducer;

    @InjectMocks
    private ReconciliationService reconciliationService;

    private LedgerAccount account;
    private LedgerBalanceSnapshot matchingSnapshot;

    @BeforeEach
    void setUp() {
        account = new LedgerAccount(
                UUID.randomUUID(), "LA-ACC-1001", null, "ACC-1001", null, "Customer",
                AccountType.LIABILITY, AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);

        matchingSnapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(), account, BigDecimal.ZERO, new BigDecimal("25000.00"), new BigDecimal("25000.00"), "INR");
    }

    @Test
    @DisplayName("Reconciliation Test: Balanced system passes with 0 discrepancies and COMPLETED status")
    void triggerReconciliation_whenMatching_shouldCompleteSuccessfully() {
        when(entryRepository.sumTotalSystemDebits()).thenReturn(new BigDecimal("100000.00"));
        when(entryRepository.sumTotalSystemCredits()).thenReturn(new BigDecimal("100000.00"));

        when(accountRepository.findAll()).thenReturn(List.of(account));
        when(entryRepository.sumDebitsByAccountId(account.getId())).thenReturn(BigDecimal.ZERO);
        when(entryRepository.sumCreditsByAccountId(account.getId())).thenReturn(new BigDecimal("25000.00"));
        when(snapshotRepository.findByLedgerAccount(account)).thenReturn(Optional.of(matchingSnapshot));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(account.getId())).thenReturn(BigDecimal.ZERO);
        when(runRepository.save(any(ReconciliationRun.class))).thenAnswer(inv -> inv.getArgument(0));

        ReconciliationRunRequest request = new ReconciliationRunRequest(ReconciliationType.LEDGER_BALANCE, null, null);
        ReconciliationRunResponse response = reconciliationService.triggerReconciliation(request, "admin");

        assertNotNull(response);
        assertEquals(ReconciliationStatus.COMPLETED, response.status());
        assertEquals(1, response.totalAccounts());
        assertEquals(1, response.matchedAccounts());
        assertEquals(0, response.mismatchedAccounts());
        verify(discrepancyRepository, never()).save(any());
    }

    @Test
    @DisplayName("Reconciliation Test: Snapshot balance mismatch is detected and saved as discrepancy")
    void triggerReconciliation_whenMismatch_shouldDetectDiscrepancy() {
        when(entryRepository.sumTotalSystemDebits()).thenReturn(new BigDecimal("100000.00"));
        when(entryRepository.sumTotalSystemCredits()).thenReturn(new BigDecimal("100000.00"));

        when(accountRepository.findAll()).thenReturn(List.of(account));
        // Actual from immutable entries: ₹25,000
        when(entryRepository.sumDebitsByAccountId(account.getId())).thenReturn(BigDecimal.ZERO);
        when(entryRepository.sumCreditsByAccountId(account.getId())).thenReturn(new BigDecimal("25000.00"));

        // Corrupted snapshot has ₹20,000
        LedgerBalanceSnapshot corrupted = new LedgerBalanceSnapshot(
                UUID.randomUUID(), account, BigDecimal.ZERO, new BigDecimal("20000.00"), new BigDecimal("20000.00"), "INR");
        when(snapshotRepository.findByLedgerAccount(account)).thenReturn(Optional.of(corrupted));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(account.getId())).thenReturn(BigDecimal.ZERO);
        when(runRepository.save(any(ReconciliationRun.class))).thenAnswer(inv -> inv.getArgument(0));

        ReconciliationRunRequest request = new ReconciliationRunRequest(ReconciliationType.LEDGER_BALANCE, null, null);
        ReconciliationRunResponse response = reconciliationService.triggerReconciliation(request, "admin");

        assertNotNull(response);
        assertEquals(ReconciliationStatus.FAILED, response.status());
        assertEquals(1, response.totalAccounts());
        assertEquals(0, response.matchedAccounts());
        assertEquals(1, response.mismatchedAccounts());
        assertEquals(new BigDecimal("5000.00"), response.differenceAmount());
        verify(discrepancyRepository).save(any(ReconciliationDiscrepancy.class));
    }

    @Test
    @DisplayName("Reconciliation Test: Discrepancy resolution updates status without modifying immutable entries")
    void resolveDiscrepancy_shouldMarkAsResolved() {
        UUID discrepancyId = UUID.randomUUID();
        ReconciliationRun run = new ReconciliationRun(UUID.randomUUID(), "REC-101", ReconciliationType.LEDGER_BALANCE, "admin");
        ReconciliationDiscrepancy discrepancy = new ReconciliationDiscrepancy(
                discrepancyId, run, account, DiscrepancyType.BALANCE_MISMATCH,
                new BigDecimal("25000.00"), new BigDecimal("20000.00"), new BigDecimal("5000.00"), "Mismatch");

        when(discrepancyRepository.findById(discrepancyId)).thenReturn(Optional.of(discrepancy));
        when(discrepancyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResolveDiscrepancyRequest request = new ResolveDiscrepancyRequest("BALANCE_CORRECTED", "Verified against immutable ledger entries");
        DiscrepancyResponse response = reconciliationService.resolveDiscrepancy(discrepancyId, request, "ops-officer");

        assertNotNull(response);
        assertEquals(DiscrepancyStatus.RESOLVED, response.status());
        assertEquals("ops-officer", response.resolvedBy());
        assertNotNull(response.resolvedAt());
    }
}
