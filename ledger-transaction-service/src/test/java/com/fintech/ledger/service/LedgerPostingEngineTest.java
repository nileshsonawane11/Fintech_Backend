package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountDetailsDto;
import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.PostingEntryItem;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.entity.LedgerBalanceSnapshot;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.EntryType;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerBalanceSnapshotRepository;
import com.fintech.ledger.repository.LedgerEntryRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LedgerPostingEngineTest {

    @Mock
    private LedgerTransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private LedgerBalanceSnapshotRepository snapshotRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @Mock
    private LedgerEventProducer eventProducer;

    @InjectMocks
    private LedgerPostingEngine postingEngine;

    private LedgerBalanceSnapshot snapshotA;
    private LedgerBalanceSnapshot snapshotB;

    @BeforeEach
    void setUp() {
        snapshotA = new LedgerBalanceSnapshot(
                UUID.randomUUID(), "ACC-1001", BigDecimal.ZERO, new BigDecimal("25000.00"), new BigDecimal("25000.00"), "INR");

        snapshotB = new LedgerBalanceSnapshot(
                UUID.randomUUID(), "ACC-2002", BigDecimal.ZERO, new BigDecimal("10000.00"), new BigDecimal("10000.00"), "INR");
    }

    @Test
    @DisplayName("Scenario 1: Debit ₹15,000 and credit ₹15,000 - Successful posting")
    void post_whenBalanced_shouldSucceed() {
        AccountDetailsDto accA = new AccountDetailsDto(
                "ACC-1001", "XXXX1001", "CUST-1", "user-sub-1", "SAVINGS", "SAVINGS", "INR", "ACTIVE", Instant.now());
        AccountDetailsDto accB = new AccountDetailsDto(
                "ACC-2002", "XXXX2002", "CUST-2", "user-sub-2", "SAVINGS", "SAVINGS", "INR", "ACTIVE", Instant.now());

        when(accountServiceClient.validateAccountEligible("ACC-1001", "INR")).thenReturn(accA);
        when(accountServiceClient.validateAccountEligible("ACC-2002", "INR")).thenReturn(accB);

        when(snapshotRepository.findWithLockByAccountId("ACC-1001")).thenReturn(Optional.of(snapshotA));
        when(snapshotRepository.findWithLockByAccountId("ACC-2002")).thenReturn(Optional.of(snapshotB));

        when(transactionRepository.save(any(LedgerTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem("ACC-1001", EntryType.DEBIT, new BigDecimal("15000.00"), "Transfer", "REF-001"),
                new PostingEntryItem("ACC-2002", EntryType.CREDIT, new BigDecimal("15000.00"), "Transfer", "REF-001")
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
                new PostingEntryItem("ACC-1001", EntryType.DEBIT, new BigDecimal("15000.00"), "Transfer", "REF-001"),
                new PostingEntryItem("ACC-2002", EntryType.CREDIT, new BigDecimal("14000.00"), "Transfer", "REF-001")
        );

        LedgerException ex = assertThrows(LedgerException.class, () ->
                postingEngine.post(TransactionType.TRANSFER, "INR", "corr-1", "Unbalanced transfer",
                        "REF-001", "idemp-2", "cust-1", "LEDGER-SERVICE", entries));

        assertEquals("UNBALANCED_POSTING", ex.getErrorCode());
        verify(transactionRepository, never()).save(any());
        verify(entryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 3: Destination account does not exist or is ineligible - Complete rollback")
    void post_whenDestinationAccountNotFound_shouldThrowNotFound() {
        AccountDetailsDto accA = new AccountDetailsDto(
                "ACC-1001", "XXXX1001", "CUST-1", "user-sub-1", "SAVINGS", "SAVINGS", "INR", "ACTIVE", Instant.now());
        when(accountServiceClient.validateAccountEligible("ACC-1001", "INR")).thenReturn(accA);
        when(accountServiceClient.validateAccountEligible("ACC-9999", "INR"))
                .thenThrow(LedgerException.accountNotFound("ACC-9999"));

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem("ACC-1001", EntryType.DEBIT, new BigDecimal("15000.00"), "Transfer", "REF-001"),
                new PostingEntryItem("ACC-9999", EntryType.CREDIT, new BigDecimal("15000.00"), "Transfer", "REF-001")
        );

        LedgerException ex = assertThrows(LedgerException.class, () ->
                postingEngine.post(TransactionType.TRANSFER, "INR", "corr-1", "Transfer",
                        "REF-001", "idemp-3", "cust-1", "LEDGER-SERVICE", entries));

        assertEquals("ACCOUNT_NOT_FOUND", ex.getErrorCode());
        verify(entryRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 4: Insufficient available balance for debit")
    void post_whenInsufficientAvailableBalance_shouldThrowInsufficientBalance() {
        AccountDetailsDto accA = new AccountDetailsDto(
                "ACC-1001", "XXXX1001", "CUST-1", "user-sub-1", "SAVINGS", "SAVINGS", "INR", "ACTIVE", Instant.now());
        AccountDetailsDto accB = new AccountDetailsDto(
                "ACC-2002", "XXXX2002", "CUST-2", "user-sub-2", "SAVINGS", "SAVINGS", "INR", "ACTIVE", Instant.now());

        when(accountServiceClient.validateAccountEligible("ACC-1001", "INR")).thenReturn(accA);
        when(accountServiceClient.validateAccountEligible("ACC-2002", "INR")).thenReturn(accB);

        // Ledger balance 25,000 -> Requested debit is 30,000 -> Insufficient
        when(snapshotRepository.findWithLockByAccountId("ACC-1001")).thenReturn(Optional.of(snapshotA));
        when(snapshotRepository.findWithLockByAccountId("ACC-2002")).thenReturn(Optional.of(snapshotB));

        List<PostingEntryItem> entries = List.of(
                new PostingEntryItem("ACC-1001", EntryType.DEBIT, new BigDecimal("30000.00"), "Transfer", "REF-001"),
                new PostingEntryItem("ACC-2002", EntryType.CREDIT, new BigDecimal("30000.00"), "Transfer", "REF-001")
        );

        LedgerException ex = assertThrows(LedgerException.class, () ->
                postingEngine.post(TransactionType.TRANSFER, "INR", "corr-1", "Transfer",
                        "REF-001", "idemp-4", "cust-1", "LEDGER-SERVICE", entries));

        assertEquals("INSUFFICIENT_BALANCE", ex.getErrorCode());
        verify(entryRepository, never()).save(any());
    }
}
