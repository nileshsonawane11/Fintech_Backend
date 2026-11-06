package com.fintech.ledger.service;

import com.fintech.ledger.dto.request.ReverseTransactionRequest;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.dto.response.ReversalResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.entity.LedgerEntry;
import com.fintech.ledger.entity.LedgerTransaction;
import com.fintech.ledger.enums.*;
import com.fintech.ledger.event.LedgerEventProducer;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerEntryRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
import com.fintech.ledger.repository.TransactionReversalRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReversalServiceTest {

    @Mock
    private LedgerTransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private TransactionReversalRepository reversalRepository;

    @Mock
    private LedgerPostingEngine postingEngine;

    @Mock
    private LedgerEventProducer eventProducer;

    @InjectMocks
    private ReversalService reversalService;

    private LedgerTransaction originalTx;
    private LedgerTransaction reversalTx;
    private LedgerAccount accountA;
    private LedgerAccount accountB;
    private LedgerEntry debitEntry;
    private LedgerEntry creditEntry;

    @BeforeEach
    void setUp() {
        originalTx = new LedgerTransaction();
        originalTx.setId(UUID.randomUUID());
        originalTx.setTransactionId("TXN-112233");
        originalTx.setTransactionType(TransactionType.TRANSFER);
        originalTx.setTransactionStatus(TransactionStatus.SUCCESS);
        originalTx.setCurrency("INR");
        originalTx.setTotalDebit(new BigDecimal("15000.00"));
        originalTx.setTotalCredit(new BigDecimal("15000.00"));
        originalTx.setValueDate(LocalDate.now());

        reversalTx = new LedgerTransaction();
        reversalTx.setId(UUID.randomUUID());
        reversalTx.setTransactionId("TXN-112234");
        reversalTx.setTransactionType(TransactionType.REVERSAL);
        reversalTx.setTransactionStatus(TransactionStatus.SUCCESS);
        reversalTx.setCurrency("INR");

        accountA = new LedgerAccount(UUID.randomUUID(), "LA-ACC-1", null, "ACC-1", null, "A", AccountType.LIABILITY, AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);
        accountB = new LedgerAccount(UUID.randomUUID(), "LA-ACC-2", null, "ACC-2", null, "B", AccountType.LIABILITY, AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);

        debitEntry = new LedgerEntry(UUID.randomUUID(), "LE-1", originalTx, accountA, EntryType.DEBIT, new BigDecimal("15000.00"), "INR", LocalDate.now(), "Original", "REF-1");
        creditEntry = new LedgerEntry(UUID.randomUUID(), "LE-2", originalTx, accountB, EntryType.CREDIT, new BigDecimal("15000.00"), "INR", LocalDate.now(), "Original", "REF-1");
    }

    @Test
    @DisplayName("Reversal Test: Successfully posted transaction is reversed with inverted entries")
    void reverseTransaction_whenValid_shouldPostCompensatingEntries() {
        when(transactionRepository.findByTransactionId("TXN-112233")).thenReturn(Optional.of(originalTx));
        when(reversalRepository.existsByOriginalTransaction_Id(originalTx.getId())).thenReturn(false);
        when(entryRepository.findByTransaction_Id(originalTx.getId())).thenReturn(List.of(debitEntry, creditEntry));

        LedgerPostingResponse postingResponse = new LedgerPostingResponse(
                "TXN-112234", TransactionStatus.SUCCESS, new BigDecimal("15000.00"), "INR", "LE-REV-1", "LE-REV-2", Instant.now());

        when(postingEngine.post(eq(TransactionType.REVERSAL), eq("INR"), any(), any(), any(), any(), eq("ops-user"), any(), anyList()))
                .thenReturn(postingResponse);

        when(transactionRepository.findByTransactionId("TXN-112234")).thenReturn(Optional.of(reversalTx));

        ReverseTransactionRequest request = new ReverseTransactionRequest("DUPLICATE_TRANSACTION", "Processed twice");
        ReversalResponse response = reversalService.reverseTransaction("TXN-112233", request, "ops-user", "idemp-rev-1");

        assertNotNull(response);
        assertEquals("TXN-112233", response.originalTransactionId());
        assertEquals("TXN-112234", response.reversalTransactionId());
        assertEquals("SUCCESS", response.status());

        // Verify original transaction marked as REVERSED
        assertEquals(TransactionStatus.REVERSED, originalTx.getTransactionStatus());
        assertNotNull(originalTx.getReversedAt());

        verify(reversalRepository).save(any());
        verify(eventProducer).enqueueEvent(any(), any(), eq("TRANSACTION_REVERSED"), any(), any());
    }

    @Test
    @DisplayName("Reversal Test: Duplicate reversal is rejected with 409 CONFLICT")
    void reverseTransaction_whenAlreadyReversed_shouldThrowConflict() {
        when(transactionRepository.findByTransactionId("TXN-112233")).thenReturn(Optional.of(originalTx));
        when(reversalRepository.existsByOriginalTransaction_Id(originalTx.getId())).thenReturn(true);

        ReverseTransactionRequest request = new ReverseTransactionRequest("DUPLICATE_TRANSACTION", "Already reversed");

        LedgerException ex = assertThrows(LedgerException.class, () ->
                reversalService.reverseTransaction("TXN-112233", request, "ops-user", "idemp-rev-2"));

        assertEquals("DUPLICATE_REVERSAL", ex.getErrorCode());
        verify(postingEngine, never()).post(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
}
