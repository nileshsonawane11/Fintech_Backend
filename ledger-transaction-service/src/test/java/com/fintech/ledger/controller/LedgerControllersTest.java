package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.*;
import com.fintech.ledger.dto.response.*;
import com.fintech.ledger.enums.*;
import com.fintech.ledger.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LedgerControllersTest {

    @Mock
    private BalanceService balanceService;

    @Mock
    private TransactionService transactionService;

    @Mock
    private TransferService transferService;

    @Mock
    private DepositService depositService;

    @Mock
    private WithdrawalService withdrawalService;

    @Mock
    private LedgerPostingEngine postingEngine;

    @Mock
    private HoldService holdService;

    @Mock
    private ReversalService reversalService;

    @Mock
    private ReconciliationService reconciliationService;

    @Mock
    private LedgerAccountAdminService adminService;

    private BalanceController balanceController;
    private TransactionController transactionController;
    private TransferController transferController;
    private DepositController depositController;
    private WithdrawalController withdrawalController;
    private LedgerPostingController postingController;
    private HoldController holdController;
    private ReversalController reversalController;
    private ReconciliationController reconciliationController;
    private LedgerAccountController accountController;

    private Jwt mockJwt;

    @BeforeEach
    void setUp() {
        balanceController = new BalanceController(balanceService);
        transactionController = new TransactionController(transactionService);
        transferController = new TransferController(transferService);
        depositController = new DepositController(depositService);
        withdrawalController = new WithdrawalController(withdrawalService);
        postingController = new LedgerPostingController(postingEngine, transactionService, balanceService, null);
        holdController = new HoldController(holdService);
        reversalController = new ReversalController(reversalService);
        reconciliationController = new ReconciliationController(reconciliationService);
        accountController = new LedgerAccountController(adminService, balanceService);

        mockJwt = mock(Jwt.class);
        lenient().when(mockJwt.getSubject()).thenReturn("usr-12345678");
    }

    @Test
    @DisplayName("GET /api/v1/accounts/{accountId}/balance returns 200 OK with balance breakdown")
    void getAccountBalance_shouldReturnBalance() {
        BalanceResponse mockBalance = new BalanceResponse(
                "ACC-1001", new BigDecimal("25000.00"), new BigDecimal("23500.00"),
                new BigDecimal("1500.00"), "INR", Instant.now());

        when(balanceService.getAccountBalance(eq("ACC-1001"), any(), anyBoolean())).thenReturn(mockBalance);

        ResponseEntity<BalanceResponse> response = balanceController.getAccountBalance("ACC-1001", mockJwt);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(new BigDecimal("25000.00"), response.getBody().ledgerBalance());
        assertEquals(new BigDecimal("23500.00"), response.getBody().availableBalance());
        assertEquals(new BigDecimal("1500.00"), response.getBody().holdBalance());
    }

    @Test
    @DisplayName("POST /api/v1/transfers returns 201 Created with transfer response")
    void initiateTransfer_shouldReturnCreated() {
        TransferRequest request = new TransferRequest(
                "ACC-1001", "ACC-2002", new BigDecimal("15000.00"), "INR", "Rent", "RENT-OCT-2026");

        TransferResponse mockTransfer = new TransferResponse(
                "TXN-554433", TransactionStatus.SUCCESS, TransactionType.TRANSFER,
                new BigDecimal("15000.00"), "INR", "ACC-1001", "ACC-2002", "PAY-987654", Instant.now());

        when(transferService.initiateTransfer(eq(request), eq("usr-12345678"), eq("key-uuid"), any()))
                .thenReturn(mockTransfer);

        ResponseEntity<TransferResponse> response = transferController.initiateTransfer(
                "key-uuid", "corr-uuid", request, mockJwt);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("TXN-554433", response.getBody().transactionId());
        assertEquals(TransactionStatus.SUCCESS, response.getBody().status());
    }

    @Test
    @DisplayName("POST /api/v1/deposits returns 201 Created or 202 Accepted")
    void initiateDeposit_shouldReturnStatus() {
        DepositRequest request = new DepositRequest(
                "ACC-1001", new BigDecimal("10000.00"), "INR", DepositMethod.BANK_TRANSFER, "DEP-10001");

        DepositResponse mockDeposit = new DepositResponse(
                "TXN-778899", "ACC-1001", new BigDecimal("10000.00"), "INR",
                DepositMethod.BANK_TRANSFER, "DEP-10001", TransactionStatus.SUCCESS, Instant.now(), Instant.now());

        when(depositService.initiateDeposit(eq(request), eq("usr-12345678"), any(), any()))
                .thenReturn(mockDeposit);

        ResponseEntity<DepositResponse> response = depositController.initiateDeposit(
                null, null, request, mockJwt);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("TXN-778899", response.getBody().transactionId());
    }

    @Test
    @DisplayName("POST /api/v1/withdrawals returns 201 Created")
    void initiateWithdrawal_shouldReturnCreated() {
        WithdrawalRequest request = new WithdrawalRequest(
                "ACC-1001", new BigDecimal("5000.00"), "INR", WithdrawalMethod.BANK_TRANSFER, "Personal");

        WithdrawalResponse mockWithdrawal = new WithdrawalResponse(
                "TXN-445566", "ACC-1001", new BigDecimal("5000.00"), "INR",
                WithdrawalMethod.BANK_TRANSFER, "WDL-10001", TransactionStatus.SUCCESS, Instant.now(), Instant.now());

        when(withdrawalService.initiateWithdrawal(eq(request), eq("usr-12345678"), any(), any()))
                .thenReturn(mockWithdrawal);

        ResponseEntity<WithdrawalResponse> response = withdrawalController.initiateWithdrawal(
                null, null, request, mockJwt);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("TXN-445566", response.getBody().transactionId());
    }

    @Test
    @DisplayName("POST /internal/api/v1/ledger/postings returns 201 Created")
    void createLedgerPosting_shouldReturnCreated() {
        LedgerPostingRequest request = new LedgerPostingRequest(
                TransactionType.TRANSFER, "INR", new BigDecimal("15000.00"), "corr-1",
                "LA-ACC-1001", "LA-ACC-2002", "Customer fund transfer", "PAY-987654");

        LedgerPostingResponse mockResponse = new LedgerPostingResponse(
                "TXN-554433", TransactionStatus.SUCCESS, new BigDecimal("15000.00"), "INR",
                "LE-900001", "LE-900002", Instant.now());

        when(postingEngine.post(eq(TransactionType.TRANSFER), eq("INR"), any(), any(), any(), any(), any(), any(), anyList()))
                .thenReturn(mockResponse);

        ResponseEntity<LedgerPostingResponse> response = postingController.createPosting(
                "key-1", "corr-1", request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("TXN-554433", response.getBody().transactionId());
        assertEquals("LE-900001", response.getBody().debitLedgerEntryId());
        assertEquals("LE-900002", response.getBody().creditLedgerEntryId());
    }

    @Test
    @DisplayName("POST /ops/api/v1/transactions/{transactionId}/reverse returns 201 Created")
    void reverseTransaction_shouldReturnCreated() {
        ReverseTransactionRequest request = new ReverseTransactionRequest("DUPLICATE_TRANSACTION", "Duplicate");
        ReversalResponse mockReversal = new ReversalResponse(
                "TXN-554433", "TXN-554434", "SUCCESS", "DUPLICATE_TRANSACTION", "Duplicate", "ops-user", Instant.now());

        when(reversalService.reverseTransaction(eq("TXN-554433"), eq(request), any(), any()))
                .thenReturn(mockReversal);

        ResponseEntity<ReversalResponse> response = reversalController.reverseTransaction(
                "TXN-554433", null, request, mockJwt);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("TXN-554433", response.getBody().originalTransactionId());
        assertEquals("TXN-554434", response.getBody().reversalTransactionId());
    }

    @Test
    @DisplayName("POST /ops/api/v1/reconciliation/runs returns 202 Accepted")
    void runReconciliation_shouldReturnAccepted() {
        ReconciliationRunRequest request = new ReconciliationRunRequest(ReconciliationType.LEDGER_BALANCE, null, null);
        ReconciliationRunResponse mockResponse = new ReconciliationRunResponse(
                "REC-100001", ReconciliationStatus.PENDING, Instant.now());

        when(reconciliationService.triggerReconciliation(eq(request), any()))
                .thenReturn(mockResponse);

        ResponseEntity<ReconciliationRunResponse> response = reconciliationController.runReconciliation(request, mockJwt);

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("REC-100001", response.getBody().reconciliationId());
    }

    @Test
    @DisplayName("POST /ops/api/v1/ledger/accounts/{ledgerAccountId}/rebuild-balance returns 200 OK")
    void rebuildBalanceProjection_shouldReturnRebuiltBalance() {
        BalanceResponse mockBalance = new BalanceResponse(
                "ACC-1001", new BigDecimal("25000.00"), new BigDecimal("25000.00"),
                BigDecimal.ZERO, "INR", Instant.now());

        when(balanceService.rebuildAccountBalanceProjection(eq("LA-ACC-1001"), any()))
                .thenReturn(mockBalance);

        ResponseEntity<BalanceResponse> response = accountController.rebuildBalanceProjection("LA-ACC-1001", mockJwt);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(new BigDecimal("25000.00"), response.getBody().ledgerBalance());
    }
}
