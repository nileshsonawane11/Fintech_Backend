package com.fintech.ledger.service;

import com.fintech.ledger.dto.request.ReconciliationRunRequest;
import com.fintech.ledger.dto.request.ResolveDiscrepancyRequest;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.DiscrepancyResponse;
import com.fintech.ledger.dto.response.ReconciliationRunResponse;
import com.fintech.ledger.entity.*;
import com.fintech.ledger.enums.*;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.Instant;
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
    private LedgerBalanceSnapshotRepository snapshotRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private LedgerEventProducer eventProducer;

    @InjectMocks
    private ReconciliationService reconciliationService;

    private LedgerBalanceSnapshot matchingSnapshot;

    @BeforeEach
    void setUp() {
        matchingSnapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(), "ACC-1001", BigDecimal.ZERO, new BigDecimal("25000.00"), new BigDecimal("25000.00"), "INR");
    }

    @Test
    @DisplayName("Reconciliation Test: Balanced system passes with 0 discrepancies and COMPLETED status")
    void triggerReconciliation_whenMatching_shouldCompleteSuccessfully() {
        when(entryRepository.sumTotalSystemDebits()).thenReturn(new BigDecimal("100000.00"));
        when(entryRepository.sumTotalSystemCredits()).thenReturn(new BigDecimal("100000.00"));

        when(entryRepository.findDistinctAccountIds()).thenReturn(List.of("ACC-1001"));
        when(entryRepository.sumDebitsByAccountId("ACC-1001")).thenReturn(BigDecimal.ZERO);
        when(entryRepository.sumCreditsByAccountId("ACC-1001")).thenReturn(new BigDecimal("25000.00"));
        when(snapshotRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(matchingSnapshot));
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

        when(entryRepository.findDistinctAccountIds()).thenReturn(List.of("ACC-1001"));
        // Actual from immutable entries: ₹25,000
        when(entryRepository.sumDebitsByAccountId("ACC-1001")).thenReturn(BigDecimal.ZERO);
        when(entryRepository.sumCreditsByAccountId("ACC-1001")).thenReturn(new BigDecimal("25000.00"));

        // Corrupted snapshot has ₹20,000
        LedgerBalanceSnapshot corrupted = new LedgerBalanceSnapshot(
                UUID.randomUUID(), "ACC-1001", BigDecimal.ZERO, new BigDecimal("20000.00"), new BigDecimal("20000.00"), "INR");
        when(snapshotRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(corrupted));
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
                discrepancyId, run, "ACC-1001", DiscrepancyType.BALANCE_MISMATCH,
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

    @Test
    @DisplayName("listReconciliationRuns: No filters (limit=20) queries repository with null filters and sorted PageRequest")
    void listReconciliationRuns_whenNoFilters_shouldQueryWithDefaults() {
        ReconciliationRun run = new ReconciliationRun(UUID.randomUUID(), "REC-001", ReconciliationType.LEDGER_BALANCE, "admin");
        run.setStatus(ReconciliationStatus.COMPLETED);

        PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "startedAt"));
        when(runRepository.searchRuns(isNull(), isNull(), isNull(), isNull(), eq(expectedPageRequest)))
                .thenReturn(new PageImpl<>(List.of(run), expectedPageRequest, 1));

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(null, null, null, null, 20, null);

        assertNotNull(response);
        assertEquals(1, response.data().size());
        assertEquals("REC-001", response.data().get(0).reconciliationId());
        assertFalse(response.pagination().hasMore());
        assertNull(response.pagination().nextCursor());
        verify(runRepository).searchRuns(isNull(), isNull(), isNull(), isNull(), eq(expectedPageRequest));
    }

    @Test
    @DisplayName("listReconciliationRuns: Filter by status individually")
    void listReconciliationRuns_whenStatusFilterOnly_shouldPassStatus() {
        PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "startedAt"));
        when(runRepository.searchRuns(eq(ReconciliationStatus.COMPLETED), isNull(), isNull(), isNull(), eq(expectedPageRequest)))
                .thenReturn(new PageImpl<>(List.of(), expectedPageRequest, 0));

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(ReconciliationStatus.COMPLETED, null, null, null, 20, null);

        assertNotNull(response);
        assertTrue(response.data().isEmpty());
        verify(runRepository).searchRuns(eq(ReconciliationStatus.COMPLETED), isNull(), isNull(), isNull(), eq(expectedPageRequest));
    }

    @Test
    @DisplayName("listReconciliationRuns: Filter by type individually")
    void listReconciliationRuns_whenTypeFilterOnly_shouldPassType() {
        PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "startedAt"));
        when(runRepository.searchRuns(isNull(), eq(ReconciliationType.LEDGER_BALANCE), isNull(), isNull(), eq(expectedPageRequest)))
                .thenReturn(new PageImpl<>(List.of(), expectedPageRequest, 0));

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(null, ReconciliationType.LEDGER_BALANCE, null, null, 20, null);

        assertNotNull(response);
        verify(runRepository).searchRuns(isNull(), eq(ReconciliationType.LEDGER_BALANCE), isNull(), isNull(), eq(expectedPageRequest));
    }

    @Test
    @DisplayName("listReconciliationRuns: Filter by fromDate individually")
    void listReconciliationRuns_whenFromDateOnly_shouldPassFromDate() {
        Instant fromDate = Instant.parse("2026-11-01T00:00:00Z");
        PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "startedAt"));
        when(runRepository.searchRuns(isNull(), isNull(), eq(fromDate), isNull(), eq(expectedPageRequest)))
                .thenReturn(new PageImpl<>(List.of(), expectedPageRequest, 0));

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(null, null, fromDate, null, 20, null);

        assertNotNull(response);
        verify(runRepository).searchRuns(isNull(), isNull(), eq(fromDate), isNull(), eq(expectedPageRequest));
    }

    @Test
    @DisplayName("listReconciliationRuns: Filter by toDate individually")
    void listReconciliationRuns_whenToDateOnly_shouldPassToDate() {
        Instant toDate = Instant.parse("2026-11-30T23:59:59Z");
        PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "startedAt"));
        when(runRepository.searchRuns(isNull(), isNull(), isNull(), eq(toDate), eq(expectedPageRequest)))
                .thenReturn(new PageImpl<>(List.of(), expectedPageRequest, 0));

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(null, null, null, toDate, 20, null);

        assertNotNull(response);
        verify(runRepository).searchRuns(isNull(), isNull(), isNull(), eq(toDate), eq(expectedPageRequest));
    }

    @Test
    @DisplayName("listReconciliationRuns: Multiple filters together")
    void listReconciliationRuns_whenMultipleFiltersProvided_shouldPassAll() {
        Instant fromDate = Instant.parse("2026-11-01T00:00:00Z");
        Instant toDate = Instant.parse("2026-11-30T23:59:59Z");
        PageRequest expectedPageRequest = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "startedAt"));

        ReconciliationRun run = new ReconciliationRun(UUID.randomUUID(), "REC-002", ReconciliationType.LEDGER_BALANCE, "admin");
        when(runRepository.searchRuns(eq(ReconciliationStatus.RUNNING), eq(ReconciliationType.LEDGER_BALANCE), eq(fromDate), eq(toDate), eq(expectedPageRequest)))
                .thenReturn(new PageImpl<>(List.of(run), expectedPageRequest, 1));

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(ReconciliationStatus.RUNNING, ReconciliationType.LEDGER_BALANCE, fromDate, toDate, 10, null);

        assertNotNull(response);
        assertEquals(1, response.data().size());
        assertEquals("REC-002", response.data().get(0).reconciliationId());
    }

    @Test
    @DisplayName("listReconciliationRuns: Null date parameters explicitly handled without error")
    void listReconciliationRuns_whenExplicitNullDates_shouldQueryProperly() {
        PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "startedAt"));
        when(runRepository.searchRuns(eq(ReconciliationStatus.FAILED), isNull(), isNull(), isNull(), eq(expectedPageRequest)))
                .thenReturn(new PageImpl<>(List.of(), expectedPageRequest, 0));

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(ReconciliationStatus.FAILED, null, null, null, 20, null);

        assertNotNull(response);
        verify(runRepository).searchRuns(eq(ReconciliationStatus.FAILED), isNull(), isNull(), isNull(), eq(expectedPageRequest));
    }

    @Test
    @DisplayName("listReconciliationRuns: Empty results return empty data list with hasMore=false")
    void listReconciliationRuns_whenEmptyResults_shouldReturnEmptyPage() {
        PageRequest expectedPageRequest = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "startedAt"));
        when(runRepository.searchRuns(isNull(), isNull(), isNull(), isNull(), eq(expectedPageRequest)))
                .thenReturn(new PageImpl<>(List.of(), expectedPageRequest, 0));

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(null, null, null, null, 20, null);

        assertNotNull(response);
        assertTrue(response.data().isEmpty());
        assertFalse(response.pagination().hasMore());
        assertNull(response.pagination().nextCursor());
    }

    @Test
    @DisplayName("listReconciliationRuns: Pagination and sorting with cursor parsing")
    void listReconciliationRuns_whenPaginationWithCursor_shouldCalculateNextCursor() {
        ReconciliationRun run1 = new ReconciliationRun(UUID.randomUUID(), "REC-001", ReconciliationType.LEDGER_BALANCE, "admin");
        ReconciliationRun run2 = new ReconciliationRun(UUID.randomUUID(), "REC-002", ReconciliationType.LEDGER_BALANCE, "admin");

        PageRequest pageRequest = PageRequest.of(1, 2, Sort.by(Sort.Direction.DESC, "startedAt"));
        when(runRepository.searchRuns(isNull(), isNull(), isNull(), isNull(), eq(pageRequest)))
                .thenReturn(new PageImpl<>(List.of(run1, run2), pageRequest, 10)); // total 10 means hasNext is true

        CursorPagedResponse<ReconciliationRunResponse> response =
                reconciliationService.listReconciliationRuns(null, null, null, null, 2, "1");

        assertNotNull(response);
        assertEquals(2, response.data().size());
        assertTrue(response.pagination().hasMore());
        assertEquals("2", response.pagination().nextCursor());
    }
}
