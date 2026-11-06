package com.fintech.ledger.service;

import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.entity.LedgerTransaction;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LedgerPostingEngineTest {

    @Mock
    private LedgerAccountRepository accountRepository;

    @Mock
    private LedgerTransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private LedgerBalanceSnapshotRepository snapshotRepository;

    @Mock
    private AccountHoldRepository holdRepository;

    @Mock
    private LedgerEventProducer eventProducer;

    @InjectMocks
    private LedgerPostingEngine postingEngine;

    private LedgerAccount customerAccountA;
    private LedgerAccount customerAccountB;
    private LedgerBalanceSnapshot snapshotA;
    private LedgerBalanceSnapshot snapshotB;

    @BeforeEach
    void setUp() {
        customerAccountA = new LedgerAccount(
                UUID.randomUUID(), "LA-ACC-1001", UUID.randomUUID(), "ACC-1001",
                UUID.randomUUID(), "Customer A", AccountType.LIABILITY,
                AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);

        customerAccountB = new LedgerAccount(
                UUID.randomUUID(), "LA-ACC-2002", UUID.randomUUID(), "ACC-2002",
                UUID.randomUUID(), "Customer B", AccountType.LIABILITY,
                AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);

        snapshotA = new LedgerBalanceSnapshot(
                UUID.randomUUID(), customerAccountA, BigDecimal.ZERO, new BigDecimal("25000.00"), new BigDecimal("25000.00"), "INR");

        snapshotB = new LedgerBalanceSnapshot(
                UUID.randomUUID(), customerAccountB, BigDecimal.ZERO, new BigDecimal("10000.00"), new BigDecimal("10000.00"), "INR");
    }

    @Test
    @DisplayName("Scenario 1: Debit ₹15,000 and credit ₹15,000 - Successful posting")
    void post_whenBalanced_shouldSucceed() {
        when(accountRepository.findByLedgerAccountId("LA-ACC-1001")).thenReturn(Optional.of(customerAccountA));
        when(accountRepository.findByLedgerAccountId("LA-ACC-2002")).thenReturn(Optional.of(customerAccountB));

        when(snapshotRepository.findWithLockByLedgerAccountId(customerAccountA.getId())).thenReturn(Optional.of(snapshotA));
        when(snapshotRepository.findWithLockByLedgerAccountId(customerAccountB.getId())).thenReturn(Optional.of(snapshotB));

        when(holdRepository.sumActiveHoldsByLedgerAccountId(customerAccountA.getId())).thenReturn(BigDecimal.ZERO);
        when(holdRepository.sumActiveHoldsByLedgerAccountId(customerAccountB.getId())).thenReturn(BigDecimal.ZERO);

        when(transactionRepository.save(any(LedgerTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem("LA-ACC-1001", EntryType.DEBIT, new BigDecimal("15000.00"), "Transfer", "REF-001"),
                new PostingEntryItem("LA-ACC-2002", EntryType.CREDIT, new BigDecimal("15000.00"), "Transfer", "REF-001")
        );

        LedgerPostingResponse response = postingEngine.post(
                TransactionType.TRANSFER, "INR", "corr-1", "Transfer payment", "REF-001",
                "idemp-1", "cust-1", "LEDGER-SERVICE", entries);

        assertNotNull(response);
        assertEquals(TransactionStatus.SUCCESS, response.status());
        assertEquals(new BigDecimal("15000.0000"), response.amount());
        assertEquals("INR", response.currency());
        assertNotNull(response.debitLedgerEntryId());
        assertNotNull(response.creditLedgerEntryId());
        assertEquals(2, response.entryIds().size());

        verify(entryRepository, times(2)).save(any());
        verify(snapshotRepository, times(2)).save(any());
        verify(eventProducer, times(3)).enqueueEvent(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Scenario 2: Debit ₹15,000 and credit ₹14,000 - UNBALANCED_POSTING exception")
    void post_whenUnbalanced_shouldThrowUnbalancedPosting() {
        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem("LA-ACC-1001", EntryType.DEBIT, new BigDecimal("15000.00"), "Transfer", "REF-001"),
                new PostingEntryItem("LA-ACC-2002", EntryType.CREDIT, new BigDecimal("14000.00"), "Transfer", "REF-001")
        );

        LedgerException ex = assertThrows(LedgerException.class, () ->
                postingEngine.post(TransactionType.TRANSFER, "INR", "corr-1", "Unbalanced transfer",
                        "REF-001", "idemp-2", "cust-1", "LEDGER-SERVICE", entries));

        assertEquals("UNBALANCED_POSTING", ex.getErrorCode());
        verify(transactionRepository, never()).save(any());
        verify(entryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 3: Destination account does not exist - Complete rollback")
    void post_whenDestinationAccountNotFound_shouldThrowNotFound() {
        when(accountRepository.findByLedgerAccountId("LA-ACC-1001")).thenReturn(Optional.of(customerAccountA));
        when(accountRepository.findByLedgerAccountId("LA-ACC-9999")).thenReturn(Optional.empty());

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem("LA-ACC-1001", EntryType.DEBIT, new BigDecimal("15000.00"), "Transfer", "REF-001"),
                new PostingEntryItem("LA-ACC-9999", EntryType.CREDIT, new BigDecimal("15000.00"), "Transfer", "REF-001")
        );

        LedgerException ex = assertThrows(LedgerException.class, () ->
                postingEngine.post(TransactionType.TRANSFER, "INR", "corr-1", "Transfer",
                        "REF-001", "idemp-3", "cust-1", "LEDGER-SERVICE", entries));

        assertEquals("LEDGER_ACCOUNT_NOT_FOUND", ex.getErrorCode());
        verify(entryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 4: Insufficient available balance due to active holds")
    void post_whenInsufficientAvailableBalance_shouldThrowInsufficientBalance() {
        when(accountRepository.findByLedgerAccountId("LA-ACC-1001")).thenReturn(Optional.of(customerAccountA));
        when(accountRepository.findByLedgerAccountId("LA-ACC-2002")).thenReturn(Optional.of(customerAccountB));

        // Ledger balance 25,000, active holds 15,000 -> Available: 10,000
        when(snapshotRepository.findWithLockByLedgerAccountId(customerAccountA.getId())).thenReturn(Optional.of(snapshotA));
        when(snapshotRepository.findWithLockByLedgerAccountId(customerAccountB.getId())).thenReturn(Optional.of(snapshotB));
        when(holdRepository.sumActiveHoldsByLedgerAccountId(customerAccountA.getId())).thenReturn(new BigDecimal("15000.00"));

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem("LA-ACC-1001", EntryType.DEBIT, new BigDecimal("12000.00"), "Transfer", "REF-001"),
                new PostingEntryItem("LA-ACC-2002", EntryType.CREDIT, new BigDecimal("12000.00"), "Transfer", "REF-001")
        );

        LedgerException ex = assertThrows(LedgerException.class, () ->
                postingEngine.post(TransactionType.TRANSFER, "INR", "corr-1", "Transfer",
                        "REF-001", "idemp-4", "cust-1", "LEDGER-SERVICE", entries));

        assertEquals("INSUFFICIENT_BALANCE", ex.getErrorCode());
        verify(entryRepository, never()).save(any());
    }
}
