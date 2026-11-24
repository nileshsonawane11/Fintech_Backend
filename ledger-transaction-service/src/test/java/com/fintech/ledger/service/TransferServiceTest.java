package com.fintech.ledger.service;

import com.fintech.ledger.client.AccountDetailsDto;
import com.fintech.ledger.client.AccountServiceClient;
import com.fintech.ledger.dto.request.TransferRequest;
import com.fintech.ledger.dto.response.LedgerPostingResponse;
import com.fintech.ledger.dto.response.TransferResponse;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.LedgerEntryRepository;
import com.fintech.ledger.repository.LedgerTransactionRepository;
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
    private LedgerTransactionRepository transactionRepository;

    @Mock
    private LedgerEntryRepository entryRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @InjectMocks
    private TransferService transferService;

    private final String customerSubject = "user-auth-subject-123";

    @Test
    @DisplayName("Valid Transfer: Debits source and credits destination, commits balanced posting")
    void initiateTransfer_whenValid_shouldPostAndReturnSuccess() {
        TransferRequest request = new TransferRequest(
                "ACC-1001", "ACC-2002", new BigDecimal("15000.00"), "INR", "Rent payment", "RENT-OCT-2026");

        when(idempotencyService.checkIdempotency(eq("key-1"), eq("TRANSFER"), eq(request), eq(TransferResponse.class)))
                .thenReturn(Optional.empty());

        AccountDetailsDto sourceAccount = new AccountDetailsDto(
                "ACC-1001", "XXXX1001", "CUST-1", customerSubject, "SAVINGS", "SAVINGS", "INR", "ACTIVE", Instant.now());
        AccountDetailsDto destAccount = new AccountDetailsDto(
                "ACC-2002", "XXXX2002", "CUST-2", "other-sub", "SAVINGS", "SAVINGS", "INR", "ACTIVE", Instant.now());

        when(accountServiceClient.validateAccountEligible("ACC-1001", "INR")).thenReturn(sourceAccount);
        when(accountServiceClient.validateAccountEligible("ACC-2002", "INR")).thenReturn(destAccount);

        LedgerPostingResponse postingResponse = new LedgerPostingResponse(
                "TXN-554433", TransactionStatus.SUCCESS, new BigDecimal("15000.00"), "INR",
                "LE-001", "LE-002", List.of("LE-001", "LE-002"), Instant.now());

        when(postingEngine.post(eq(TransactionType.TRANSFER), eq("INR"), any(), any(), eq("RENT-OCT-2026"),
                eq("key-1"), eq(customerSubject), any(), anyList())).thenReturn(postingResponse);

        TransferResponse response = transferService.initiateTransfer(
                request, customerSubject, "key-1", "corr-1");

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
                request, customerSubject, "key-1", "corr-1");

        assertEquals("TXN-554433", response.transactionId());
        verify(postingEngine, never()).post(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Transfer Test: Rejection when source and destination accounts are identical")
    void initiateTransfer_whenSameAccount_shouldThrowBadRequest() {
        TransferRequest request = new TransferRequest(
                "ACC-1001", "ACC-1001", new BigDecimal("500.00"), "INR", "Self", "REF");

        LedgerException ex = assertThrows(LedgerException.class, () ->
                transferService.initiateTransfer(request, customerSubject, "key-2", "corr-2"));

        assertEquals("INVALID_DESTINATION_ACCOUNT", ex.getErrorCode());
    }

    @Test
    @DisplayName("Transfer Test: Rejection when customer ownership mismatch")
    void initiateTransfer_whenOwnershipMismatch_shouldThrowForbidden() {
        TransferRequest request = new TransferRequest(
                "ACC-1001", "ACC-2002", new BigDecimal("1000.00"), "INR", "Transfer", "REF-001");

        AccountDetailsDto sourceAccount = new AccountDetailsDto(
                "ACC-1001", "XXXX1001", "CUST-1", "different-subject", "SAVINGS", "SAVINGS", "INR", "ACTIVE", Instant.now());
        when(accountServiceClient.validateAccountEligible("ACC-1001", "INR")).thenReturn(sourceAccount);
        doThrow(LedgerException.accountOwnershipMismatch("ACC-1001"))
                .when(accountServiceClient).validateCustomerOwnership("ACC-1001", customerSubject);

        LedgerException ex = assertThrows(LedgerException.class, () ->
                transferService.initiateTransfer(request, customerSubject, "key-3", "corr-3"));

        assertEquals("ACCOUNT_OWNERSHIP_MISMATCH", ex.getErrorCode());
        verify(postingEngine, never()).post(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
}
