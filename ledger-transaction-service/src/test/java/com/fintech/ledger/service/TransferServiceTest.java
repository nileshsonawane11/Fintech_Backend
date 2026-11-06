package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.TransferRequest;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.dto.response.TransferResponse;
import com.fintech.ledger.entity.LedgerAccount;
import com.fintech.ledger.enums.*;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerAccountRepository;
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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferServiceTest {

    @Mock
    private LedgerPostingEngine postingEngine;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private LedgerAccountRepository accountRepository;

    @Mock
    private LedgerTransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @InjectMocks
    private TransferService transferService;

    private LedgerAccount sourceAccount;
    private LedgerAccount destAccount;
    private final UUID customerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        sourceAccount = new LedgerAccount(
                UUID.randomUUID(), "LA-ACC-1001", UUID.randomUUID(), "ACC-1001",
                customerId, "Source Account", AccountType.LIABILITY,
                AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);

        destAccount = new LedgerAccount(
                UUID.randomUUID(), "LA-ACC-2002", UUID.randomUUID(), "ACC-2002",
                UUID.randomUUID(), "Destination Account", AccountType.LIABILITY,
                AccountSubtype.CUSTOMER_DEPOSIT, NormalBalance.CREDIT, "INR", AccountStatus.ACTIVE);
    }

    @Test
    @DisplayName("Valid Transfer: Debits source and credits destination, commits balanced posting")
    void initiateTransfer_whenValid_shouldPostAndReturnSuccess() {
        TransferRequest request = new TransferRequest(
                "ACC-1001", "ACC-2002", new BigDecimal("15000.00"), "INR", "Rent payment", "RENT-OCT-2026");

        when(idempotencyService.checkIdempotency(eq("key-1"), eq("TRANSFER"), eq(request), eq(TransferResponse.class)))
                .thenReturn(Optional.empty());

        when(accountRepository.findByAccountReference("ACC-1001")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountReference("ACC-2002")).thenReturn(Optional.of(destAccount));

        LedgerPostingResponse postingResponse = new LedgerPostingResponse(
                "TXN-554433", TransactionStatus.SUCCESS, new BigDecimal("15000.00"), "INR",
                "LE-001", "LE-002", Instant.now());

        when(postingEngine.post(eq(TransactionType.TRANSFER), eq("INR"), any(), any(), eq("RENT-OCT-2026"),
                eq("key-1"), eq(customerId.toString()), any(), anyList())).thenReturn(postingResponse);

        TransferResponse response = transferService.initiateTransfer(
                request, customerId.toString(), "key-1", "corr-1");

        assertNotNull(response);
        assertEquals("TXN-554433", response.transactionId());
        assertEquals(TransactionStatus.SUCCESS, response.status());
        assertEquals(new BigDecimal("15000.00"), response.amount());
        assertEquals("ACC-1001", response.sourceAccountId());
        assertEquals("ACC-2002", response.destinationAccountId());

        verify(idempotencyService).recordSuccess(eq("key-1"), any(), eq(201), any());
    }

    @Test
    @DisplayName("Transfer Test: Idempotency replay returns cached response without duplicate posting")
    void initiateTransfer_whenIdempotentRetry_shouldReturnCachedResponse() {
        TransferRequest request = new TransferRequest(
                "ACC-1001", "ACC-2002", new BigDecimal("15000.00"), "INR", "Rent", "RENT-OCT-2026");

        TransferResponse cached = new TransferResponse(
                "TXN-554433", TransactionStatus.SUCCESS, TransactionType.TRANSFER,
                new BigDecimal("15000.00"), "INR", "ACC-1001", "ACC-2002", "RENT-OCT-2026", Instant.now());

        when(idempotencyService.checkIdempotency(eq("key-1"), eq("TRANSFER"), eq(request), eq(TransferResponse.class)))
                .thenReturn(Optional.of(cached));

        TransferResponse response = transferService.initiateTransfer(
                request, customerId.toString(), "key-1", "corr-1");

        assertEquals("TXN-554433", response.transactionId());
        verify(postingEngine, never()).post(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Transfer Test: Rejection when source and destination accounts are identical")
    void initiateTransfer_whenSameAccount_shouldThrowBadRequest() {
        TransferRequest request = new TransferRequest(
                "ACC-1001", "ACC-1001", new BigDecimal("500.00"), "INR", "Self", "REF");

        LedgerException ex = assertThrows(LedgerException.class, () ->
                transferService.initiateTransfer(request, customerId.toString(), "key-2", "corr-2"));

        assertEquals("INVALID_DESTINATION_ACCOUNT", ex.getErrorCode());
    }
}
