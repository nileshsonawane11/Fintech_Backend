package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountDetailsDto;
import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.response.BalanceHistoryItem;
import com.fintech.ledger.dto.response.BalanceResponse;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import com.fintech.ledger.repository.LedgerEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BalanceServiceTest {

    @Mock
    private LedgerBalanceSnapshotRepository snapshotRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @InjectMocks
    private BalanceService balanceService;

    private LedgerBalanceSnapshot snapshot;
    private AccountDetailsDto accountDto;
    private final String identitySubject = "auth0|cust-12345";

    @BeforeEach
    void setUp() {
        accountDto = new AccountDetailsDto(
                UUID.randomUUID(), "ACC-1001", "************1001", "CUS-1001",
                identitySubject, UUID.randomUUID(), "SAV-STD", "SAVINGS", "INR", "ACTIVE", Instant.now());

        snapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(), "ACC-1001", BigDecimal.ZERO, new BigDecimal("25000.00"), new BigDecimal("25000.00"), "INR");
    }

    @Test
    @DisplayName("Balance Test: Customer can view balance matching identitySubject with 0 holds -> Available ₹25,000")
    void getAccountBalance_withMatchingIdentitySubject_shouldSucceed() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001")).thenReturn(BigDecimal.ZERO);
        when(snapshotRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(snapshot));

        BalanceResponse balance = balanceService.getAccountBalance("ACC-1001", identitySubject, false);

        assertNotNull(balance);
        assertEquals("ACC-1001", balance.accountId());
        assertEquals(new BigDecimal("25000.00"), balance.ledgerBalance());
        assertEquals(new BigDecimal("25000.00"), balance.availableBalance());
        assertEquals(BigDecimal.ZERO, balance.holdBalance());
        assertEquals("INR", balance.currency());

        verify(accountServiceClient).validateCustomerOwnership("ACC-1001", identitySubject);
        verify(accountServiceClient).getActiveHoldAmount("ACC-1001");
    }

    @Test
    @DisplayName("Balance Test: Single active hold of ₹5,000 correctly reduces available balance to ₹20,000")
    void getAccountBalance_withSingleActiveHold_shouldDeductHoldFromAvailableBalance() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001")).thenReturn(new BigDecimal("5000.00"));
        when(snapshotRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(snapshot));

        BalanceResponse balance = balanceService.getAccountBalance("ACC-1001", identitySubject, false);

        assertNotNull(balance);
        assertEquals("ACC-1001", balance.accountId());
        assertEquals(new BigDecimal("25000.00"), balance.ledgerBalance());
        assertEquals(new BigDecimal("20000.00"), balance.availableBalance());
        assertEquals(new BigDecimal("5000.00"), balance.holdBalance());
        assertEquals("INR", balance.currency());

        verify(accountServiceClient).getActiveHoldAmount("ACC-1001");
    }

    @Test
    @DisplayName("Balance Test: Multiple active holds totalling ₹7,500 correctly reduce available balance to ₹17,500")
    void getAccountBalance_withMultipleActiveHolds_shouldDeductSumFromAvailableBalance() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001")).thenReturn(new BigDecimal("7500.00"));
        when(snapshotRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(snapshot));

        BalanceResponse balance = balanceService.getAccountBalance("ACC-1001", identitySubject, false);

        assertNotNull(balance);
        assertEquals("ACC-1001", balance.accountId());
        assertEquals(new BigDecimal("25000.00"), balance.ledgerBalance());
        assertEquals(new BigDecimal("17500.00"), balance.availableBalance());
        assertEquals(new BigDecimal("7500.00"), balance.holdBalance());
        assertEquals("INR", balance.currency());

        verify(accountServiceClient).getActiveHoldAmount("ACC-1001");
    }

    @Test
    @DisplayName("Balance Test: When snapshot does not exist, compute transient balance without mutating database in read-only mode")
    void getAccountBalance_whenSnapshotDoesNotExist_shouldComputeTransientSnapshotWithoutSaving() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001")).thenReturn(BigDecimal.ZERO);
        when(snapshotRepository.findByAccountId("ACC-1001")).thenReturn(Optional.empty());
        when(entryRepository.sumDebitsByAccountId("ACC-1001")).thenReturn(new BigDecimal("2000.00"));
        when(entryRepository.sumCreditsByAccountId("ACC-1001")).thenReturn(new BigDecimal("10000.00"));
        when(entryRepository.findLatestByAccountId(eq("ACC-1001"), any(PageRequest.class))).thenReturn(Collections.emptyList());

        BalanceResponse balance = balanceService.getAccountBalance("ACC-1001", identitySubject, false);

        assertNotNull(balance);
        assertEquals("ACC-1001", balance.accountId());
        assertEquals(new BigDecimal("8000.00"), balance.ledgerBalance());
        assertEquals(new BigDecimal("8000.00"), balance.availableBalance());
        assertEquals(BigDecimal.ZERO, balance.holdBalance());
        // Verify database was NOT mutated
        verify(snapshotRepository, never()).save(any());
    }

    @Test
    @DisplayName("Balance Test: System accounts should not query Account Service for holds or details")
    void getAccountBalance_forSystemAccount_shouldNotCallAccountService() {
        LedgerBalanceSnapshot systemSnapshot = new LedgerBalanceSnapshot(
                UUID.randomUUID(), "LA-BANK-CASH-INR", new BigDecimal("1000000.00"), BigDecimal.ZERO, new BigDecimal("1000000.00"), "INR");
        when(snapshotRepository.findByAccountId("LA-BANK-CASH-INR")).thenReturn(Optional.of(systemSnapshot));

        BalanceResponse balance = balanceService.getAccountBalance("LA-BANK-CASH-INR", null, true);

        assertNotNull(balance);
        assertEquals("LA-BANK-CASH-INR", balance.accountId());
        assertEquals(new BigDecimal("1000000.00"), balance.ledgerBalance());
        assertEquals(new BigDecimal("1000000.00"), balance.availableBalance());
        assertEquals(BigDecimal.ZERO, balance.holdBalance());

        verifyNoInteractions(accountServiceClient);
    }

    @Test
    @DisplayName("Balance Test: Account Service timeout while retrieving holds throws SERVICE_UNAVAILABLE")
    void getAccountBalance_whenAccountServiceTimeout_shouldThrowServiceUnavailable() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001"))
                .thenThrow(LedgerException.serviceUnavailable("Account Service timed out while retrieving holds for account: ACC-1001"));

        LedgerException ex = assertThrows(LedgerException.class, () ->
                balanceService.getAccountBalance("ACC-1001", identitySubject, false));

        assertEquals("SERVICE_UNAVAILABLE", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("timed out"));
    }

    @Test
    @DisplayName("Balance Test: Account Service unreachable while retrieving holds throws SERVICE_UNAVAILABLE")
    void getAccountBalance_whenAccountServiceUnreachable_shouldThrowServiceUnavailable() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001"))
                .thenThrow(LedgerException.serviceUnavailable("Account Service is currently unreachable."));

        LedgerException ex = assertThrows(LedgerException.class, () ->
                balanceService.getAccountBalance("ACC-1001", identitySubject, false));

        assertEquals("SERVICE_UNAVAILABLE", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("unreachable"));
    }

    @Test
    @DisplayName("Balance Test: Account not found in Account Service throws ACCOUNT_NOT_FOUND")
    void getAccountBalance_whenAccountNotFound_shouldThrowAccountNotFound() {
        when(accountServiceClient.getAccount("ACC-1001"))
                .thenThrow(LedgerException.accountNotFound("Account ACC-1001 was not found in Account Service."));

        LedgerException ex = assertThrows(LedgerException.class, () ->
                balanceService.getAccountBalance("ACC-1001", identitySubject, false));

        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
    }

    @Test
    @DisplayName("Balance Test: Ownership mismatch rejects unauthorized access with 403 Forbidden")
    void getAccountBalance_withMismatchedIdentitySubject_shouldThrowForbidden() {
        doThrow(LedgerException.forbidden("Access denied: You do not own account ACC-1001"))
                .when(accountServiceClient).validateCustomerOwnership("ACC-1001", "other-subject");

        LedgerException ex = assertThrows(LedgerException.class, () ->
                balanceService.getAccountBalance("ACC-1001", "other-subject", false));

        assertEquals("FORBIDDEN", ex.getErrorCode());
    }

    @Test
    @DisplayName("Balance Test: Authoritative balance projection rebuild recalculates from entries and applies active holds")
    void rebuildAccountBalanceProjection_shouldCalculateFromEntriesAndSaveSnapshot() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001")).thenReturn(new BigDecimal("3000.00"));
        when(snapshotRepository.findWithLockByAccountId("ACC-1001")).thenReturn(Optional.of(snapshot));
        when(entryRepository.sumDebitsByAccountId("ACC-1001")).thenReturn(new BigDecimal("5000.00"));
        when(entryRepository.sumCreditsByAccountId("ACC-1001")).thenReturn(new BigDecimal("30000.00"));
        when(entryRepository.findLatestByAccountId(eq("ACC-1001"), any(PageRequest.class))).thenReturn(Collections.emptyList());
        when(snapshotRepository.save(any(LedgerBalanceSnapshot.class))).thenAnswer(i -> i.getArgument(0));

        BalanceResponse rebuilt = balanceService.rebuildAccountBalanceProjection("ACC-1001", "ops-admin");

        assertNotNull(rebuilt);
        assertEquals(new BigDecimal("25000.00"), rebuilt.ledgerBalance());
        assertEquals(new BigDecimal("22000.00"), rebuilt.availableBalance());
        assertEquals(new BigDecimal("3000.00"), rebuilt.holdBalance());
        verify(snapshotRepository).save(any(LedgerBalanceSnapshot.class));
        verify(accountServiceClient).getActiveHoldAmount("ACC-1001");
    }

    @Test
    @DisplayName("Balance History: Chronological trajectory computed correctly for liability/deposit account (newest to oldest)")
    void getBalanceHistory_withEntries_shouldCalculateAccurateHistoricalTrajectoryNewestToOldest() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001")).thenReturn(new BigDecimal("1000.00"));

        Instant t1 = Instant.parse("2026-11-20T10:00:00Z");
        Instant t2 = Instant.parse("2026-11-20T11:00:00Z");

        // Oldest entry: Credit 10,000 (balance after = 10,000)
        LedgerEntry e1 = new LedgerEntry(UUID.randomUUID(), "LE-1", null, "ACC-1001", EntryType.CREDIT,
                new BigDecimal("10000.00"), "INR", LocalDate.of(2026, 11, 20), "Deposit", "REF-1");
        e1.setCreatedAt(t1);

        // Newest entry: Debit 2,000 (balance after = 8,000)
        LedgerEntry e2 = new LedgerEntry(UUID.randomUUID(), "LE-2", null, "ACC-1001", EntryType.DEBIT,
                new BigDecimal("2000.00"), "INR", LocalDate.of(2026, 11, 20), "Withdrawal", "REF-2");
        e2.setCreatedAt(t2);

        // findByAccountIdAndDates returns entries ordered newest first: [e2, e1]
        when(entryRepository.findByAccountIdAndDates(eq("ACC-1001"), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(e2, e1), PageRequest.of(0, 20), 2));

        // Up to e2 (newest entry): total debits = 2000, total credits = 10000 -> net balance = 8000
        when(entryRepository.sumDebitsUpTo("ACC-1001", t2)).thenReturn(new BigDecimal("2000.00"));
        when(entryRepository.sumCreditsUpTo("ACC-1001", t2)).thenReturn(new BigDecimal("10000.00"));

        CursorPagedResponse<BalanceHistoryItem> response = balanceService.getBalanceHistory(
                "ACC-1001", identitySubject, false, null, null, 20, null);

        assertNotNull(response);
        assertEquals(2, response.data().size());

        // e2 (newest): ledger balance should be 8,000; available should be 8,000 - 1,000 = 7,000
        BalanceHistoryItem item0 = response.data().get(0);
        assertEquals(new BigDecimal("8000.00"), item0.ledgerBalance());
        assertEquals(new BigDecimal("7000.00"), item0.availableBalance());
        assertEquals(new BigDecimal("1000.00"), item0.holdBalance());

        // e1 (oldest): ledger balance should be 10,000; available should be 10,000 - 1,000 = 9,000
        BalanceHistoryItem item1 = response.data().get(1);
        assertEquals(new BigDecimal("10000.00"), item1.ledgerBalance());
        assertEquals(new BigDecimal("9000.00"), item1.availableBalance());
        assertEquals(new BigDecimal("1000.00"), item1.holdBalance());
    }

    @Test
    @DisplayName("Balance History: Chronological trajectory computed correctly for system asset account")
    void getBalanceHistory_forAssetAccount_shouldCalculateAssetBalanceTrajectory() {
        Instant t1 = Instant.parse("2026-11-20T10:00:00Z");
        Instant t2 = Instant.parse("2026-11-20T11:00:00Z");

        // Oldest: Debit 10,000 (asset balance = +10,000)
        LedgerEntry e1 = new LedgerEntry(UUID.randomUUID(), "LE-1", null, "LA-BANK-CASH-INR", EntryType.DEBIT,
                new BigDecimal("10000.00"), "INR", LocalDate.of(2026, 11, 20), "Initial cash", "REF-1");
        e1.setCreatedAt(t1);

        // Newest: Debit 5,000 (asset balance = +15,000)
        LedgerEntry e2 = new LedgerEntry(UUID.randomUUID(), "LE-2", null, "LA-BANK-CASH-INR", EntryType.DEBIT,
                new BigDecimal("5000.00"), "INR", LocalDate.of(2026, 11, 20), "Cash in", "REF-2");
        e2.setCreatedAt(t2);

        when(entryRepository.findByAccountIdAndDates(eq("LA-BANK-CASH-INR"), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(e2, e1), PageRequest.of(0, 20), 2));

        when(entryRepository.sumDebitsUpTo("LA-BANK-CASH-INR", t2)).thenReturn(new BigDecimal("15000.00"));
        when(entryRepository.sumCreditsUpTo("LA-BANK-CASH-INR", t2)).thenReturn(BigDecimal.ZERO);

        CursorPagedResponse<BalanceHistoryItem> response = balanceService.getBalanceHistory(
                "LA-BANK-CASH-INR", null, true, null, null, 20, null);

        assertNotNull(response);
        assertEquals(2, response.data().size());

        // e2 (newest): asset balance = debits - credits = 15,000
        assertEquals(new BigDecimal("15000.00"), response.data().get(0).ledgerBalance());
        // e1 (oldest): asset balance = 15,000 - 5,000 = 10,000
        assertEquals(new BigDecimal("10000.00"), response.data().get(1).ledgerBalance());
    }

    @Test
    @DisplayName("Balance History: Empty entry list returns empty response gracefully")
    void getBalanceHistory_whenNoEntries_shouldReturnEmptyPage() {
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(accountDto);
        when(accountServiceClient.getActiveHoldAmount("ACC-1001")).thenReturn(BigDecimal.ZERO);
        when(entryRepository.findByAccountIdAndDates(eq("ACC-1001"), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 20), 0));

        CursorPagedResponse<BalanceHistoryItem> response = balanceService.getBalanceHistory(
                "ACC-1001", identitySubject, false, null, null, 20, null);

        assertNotNull(response);
        assertTrue(response.data().isEmpty());
        assertFalse(response.pagination().hasMore());
        verify(entryRepository, never()).sumDebitsUpTo(any(), any());
    }

    @Test
    @DisplayName("Balance History: Invalid date range (fromDate > toDate) throws BadRequest")
    void getBalanceHistory_withInvalidDateRange_shouldThrowBadRequest() {
        LocalDate fromDate = LocalDate.of(2026, 12, 1);
        LocalDate toDate = LocalDate.of(2026, 11, 1);

        LedgerException ex = assertThrows(LedgerException.class, () ->
                balanceService.getBalanceHistory("ACC-1001", identitySubject, false, fromDate, toDate, 20, null));

        assertEquals("INVALID_DATE_RANGE", ex.getErrorCode());
    }

    @Test
    @DisplayName("Balance History: Blank accountId throws BadRequest")
    void getBalanceHistory_withBlankAccountId_shouldThrowBadRequest() {
        LedgerException ex = assertThrows(LedgerException.class, () ->
                balanceService.getBalanceHistory("   ", identitySubject, false, null, null, 20, null));

        assertEquals("INVALID_ACCOUNT_ID", ex.getErrorCode());
    }
}
