package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.client.AccountServiceClient;
import com.fintech.payment.client.CustomerServiceClient;
import com.fintech.payment.client.LedgerServiceClient;
import com.fintech.payment.client.dto.CustomerProfileDto;
import com.fintech.payment.client.dto.InternalAccountDto;
import com.fintech.payment.client.dto.LedgerBalanceDto;
import com.fintech.payment.client.dto.LedgerDtos.LedgerPostingResponseDto;
import com.fintech.payment.client.dto.LedgerDtos.ReversalResponseDto;
import com.fintech.payment.dto.request.InitiateTransferRequest;
import com.fintech.payment.dto.request.InitiateUpiTransferRequest;
import com.fintech.payment.dto.response.PaymentResponse;
import com.fintech.payment.entity.Beneficiary;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.entity.PaymentIdempotencyKey;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.PayoutProvider;
import com.fintech.payment.provider.model.ProviderModels.PayoutResult;
import com.fintech.payment.repository.PaymentIdempotencyKeyRepository;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.service.PaymentFeeAndLimitService.FeeCalculation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

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
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentIdempotencyKeyRepository idempotencyKeyRepository;
    @Mock private BeneficiaryService beneficiaryService;
    @Mock private CustomerServiceClient customerServiceClient;
    @Mock private AccountServiceClient accountServiceClient;
    @Mock private LedgerServiceClient ledgerServiceClient;
    @Mock private PayoutProvider payoutProvider;
    @Mock private PaymentFeeAndLimitService feeAndLimitService;
    @Mock private PaymentOutboxService outboxService;
    @Mock private PaymentAuditService auditService;

    private PaymentIdempotencyService idempotencyService;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        idempotencyService = new PaymentIdempotencyService(
                idempotencyKeyRepository, new ObjectMapper().findAndRegisterModules(), 24L);
        paymentService = new PaymentService(
                paymentRepository, idempotencyKeyRepository, beneficiaryService,
                customerServiceClient, accountServiceClient, ledgerServiceClient,
                payoutProvider, idempotencyService, feeAndLimitService, outboxService, auditService);
    }

    @Test
    void rejectsMissingIdempotencyKeyAsBadRequest() {
        ApiException exception = assertThrows(ApiException.class,
                () -> paymentService.initiateTransfer("customer-1", null, new InitiateTransferRequest()));

        assertEquals("VALIDATION_FAILED", exception.getCode());
        assertEquals(400, exception.getHttpStatus().value());
        verify(idempotencyKeyRepository, never()).findByIdempotencyKey(anyString());
    }

    @Test
    void rejectsMalformedIdempotencyKeyAsBadRequest() {
        ApiException exception = assertThrows(ApiException.class,
                () -> paymentService.initiateTransfer("customer-1", "not-a-uuid", new InitiateTransferRequest()));

        assertEquals("VALIDATION_FAILED", exception.getCode());
        assertEquals(400, exception.getHttpStatus().value());
    }

    @Test
    void returnsConflictWhenIdempotencyKeyReusedWithDifferentPayload() {
        String idempotencyKey = UUID.randomUUID().toString();
        PaymentIdempotencyKey existing = new PaymentIdempotencyKey();
        existing.setIdempotencyKey(idempotencyKey);
        existing.setRequestHash("different-hash");
        existing.setProcessingStatus("COMPLETED");
        when(idempotencyKeyRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.of(existing));

        ApiException exception = assertThrows(ApiException.class,
                () -> paymentService.initiateTransfer("customer-1", idempotencyKey, new InitiateTransferRequest()));

        assertEquals("IDEMPOTENCY_KEY_REUSED", exception.getCode());
        assertEquals(409, exception.getHttpStatus().value());
    }

    @Test
    void initiatesBankImpsPayoutWithAtomicLedgerDebitAndPayoutSubmission() {
        String idemp = UUID.randomUUID().toString();
        InitiateTransferRequest req = bankTransferRequest("IMPS", new BigDecimal("1000.00"));
        stubHappyPathPrerequisites("user-1", "BANK_ACCOUNT", "IMPS", new BigDecimal("1000.00"),
                new BigDecimal("5.00"), new BigDecimal("0.90"), new BigDecimal("5000.00"));

        when(payoutProvider.createPayout(any())).thenReturn(new PayoutResult(
                "pout_123", "fa_1", "processing", new BigDecimal("1000.00"), "INR", "IMPS",
                null, null, null, null, null, null, false));

        PaymentResponse res = paymentService.initiateTransfer("user-1", idemp, req);

        assertEquals("PROCESSING", res.getStatus());
        assertEquals("pout_123", res.getProviderPayoutId());
        assertEquals("TXN-LEDGER-1", res.getLedgerTransactionId());
        assertEquals(new BigDecimal("1005.90"), res.getTotalDebitAmount());
        verify(ledgerServiceClient).postBatch(startsWith("debit-"), any());
        verify(payoutProvider).createPayout(argThat(cmd -> idemp.equals(cmd.idempotencyKey())));
    }

    @Test
    void initiatesUpiPayoutSuccessfully() {
        String idemp = UUID.randomUUID().toString();
        stubHappyPathPrerequisites("user-1", "UPI", "UPI", new BigDecimal("500.00"),
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("5000.00"));
        when(payoutProvider.createPayout(any())).thenReturn(new PayoutResult(
                "pout_upi_1", "fa_upi", "processed", new BigDecimal("500.00"), "INR", "UPI",
                "UTR888", null, null, null, null, null, false));

        PaymentResponse res = paymentService.initiateUpiTransfer("user-1", idemp,
                new InitiateUpiTransferRequest("ACC-1001", "BEN-1", new BigDecimal("500.00"), "INR", "Dinner"));

        assertEquals("COMPLETED", res.getStatus());
        verify(ledgerServiceClient, times(2)).postBatch(anyString(), any());
    }

    @Test
    void rejectsTransferWhenAvailableBalanceIsInsufficient() {
        String idemp = UUID.randomUUID().toString();
        InitiateTransferRequest req = bankTransferRequest("IMPS", new BigDecimal("1000.00"));
        stubHappyPathPrerequisites("user-1", "BANK_ACCOUNT", "IMPS", new BigDecimal("1000.00"),
                new BigDecimal("5.00"), new BigDecimal("0.90"), new BigDecimal("500.00"));

        ApiException ex = assertThrows(ApiException.class,
                () -> paymentService.initiateTransfer("user-1", idemp, req));
        assertEquals("INSUFFICIENT_BALANCE", ex.getCode());
        assertEquals(422, ex.getStatus().value());
        verify(ledgerServiceClient, never()).postBatch(anyString(), any());
        verify(payoutProvider, never()).createPayout(any());
    }

    @Test
    void placesTransferIntoUnknownPendingReconciliationOnProviderTimeoutWithoutReversing() {
        String idemp = UUID.randomUUID().toString();
        InitiateTransferRequest req = bankTransferRequest("NEFT", new BigDecimal("2000.00"));
        stubHappyPathPrerequisites("user-1", "BANK_ACCOUNT", "NEFT", new BigDecimal("2000.00"),
                new BigDecimal("2.50"), new BigDecimal("0.45"), new BigDecimal("5000.00"));

        when(payoutProvider.createPayout(any())).thenReturn(new PayoutResult(
                null, "fa_1", "UNKNOWN", new BigDecimal("2000.00"), "INR", "NEFT",
                null, null, null, "gateway", "timeout", "Timed out", true));

        PaymentResponse res = paymentService.initiateTransfer("user-1", idemp, req);

        assertEquals("UNKNOWN_PENDING_RECONCILIATION", res.getStatus());
        verify(ledgerServiceClient, never()).reverseTransaction(any(), any(), any(), any());
        verify(payoutProvider, times(1)).createPayout(any());
    }

    @Test
    void reversesLedgerDebitWhenProviderExplicitlyRejectsPayoutSubmission() {
        String idemp = UUID.randomUUID().toString();
        InitiateTransferRequest req = bankTransferRequest("IMPS", new BigDecimal("1000.00"));
        stubHappyPathPrerequisites("user-1", "BANK_ACCOUNT", "IMPS", new BigDecimal("1000.00"),
                new BigDecimal("5.00"), new BigDecimal("0.90"), new BigDecimal("5000.00"));

        when(payoutProvider.createPayout(any()))
                .thenThrow(new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "RZP_BAD_REQUEST", "IFSC invalid"));
        when(ledgerServiceClient.reverseTransaction(eq("TXN-LEDGER-1"), anyString(), anyString(), anyString()))
                .thenReturn(new ReversalResponseDto("TXN-LEDGER-1", "TXN-REV-1", "SUCCESS",
                        "PROVIDER_SUBMISSION_REJECTED", "IFSC invalid", "SYSTEM", Instant.now()));

        assertThrows(ApiException.class, () -> paymentService.initiateTransfer("user-1", idemp, req));
        verify(ledgerServiceClient).reverseTransaction(eq("TXN-LEDGER-1"), anyString(), anyString(), anyString());
    }

    @Test
    void reversesLedgerDebitWhenPayoutFailedOrReversedWebhookArrives() {
        Payment payment = new Payment();
        payment.setPaymentId("PAY-1");
        payment.setCustomerId("CUS-1");
        payment.setDebitAccountId("ACC-1001");
        payment.setAmount(new BigDecimal("1000.00"));
        payment.setTotalDebitAmount(new BigDecimal("1005.90"));
        payment.setCurrency("INR");
        payment.setProviderPayoutId("pout_1");
        payment.setLedgerTransactionId("TXN-LEDGER-1");
        payment.setStatus("PROCESSING");

        when(paymentRepository.findByProviderPayoutId("pout_1")).thenReturn(Optional.of(payment));
        when(ledgerServiceClient.reverseTransaction(eq("TXN-LEDGER-1"), eq("rev-PAY-1"), anyString(), anyString()))
                .thenReturn(new ReversalResponseDto("TXN-LEDGER-1", "TXN-REV-1", "SUCCESS",
                        "insufficient_funds", "Reversed", "SYSTEM", Instant.now()));

        paymentService.handlePayoutWebhookUpdate("pout_1", "reversed", null, "insufficient_funds", "Reversed by bank");

        assertEquals("REVERSED", payment.getStatus());
        assertEquals("TXN-REV-1", payment.getLedgerReversalTxId());

        // Duplicate webhook after terminal state does not reverse again
        paymentService.handlePayoutWebhookUpdate("pout_1", "reversed", null, "insufficient_funds", "Duplicate");
        verify(ledgerServiceClient, times(1)).reverseTransaction(any(), any(), any(), any());
    }

    private void stubHappyPathPrerequisites(
            String userId, String beneficiaryType, String mode,
            BigDecimal amount, BigDecimal baseFee, BigDecimal tax, BigDecimal availableBalance) {
        CustomerProfileDto customer = new CustomerProfileDto(
                "CUS-1", "Aarav", LocalDate.of(1995, 1, 1), "+919876543210",
                "aarav@example.com", "ABCDE1234F", "APPROVED", "LOW", Instant.now(), "MALE");
        InternalAccountDto account = new InternalAccountDto(
                "ACC-1001", "FINB****1001", "CUS-1", userId, "SAVINGS", "SAVINGS_REGULAR",
                "ACTIVE", "INR", Instant.now());
        Beneficiary beneficiary = new Beneficiary();
        beneficiary.setBeneficiaryId("BEN-1");
        beneficiary.setUserId(userId);
        beneficiary.setBeneficiaryType(beneficiaryType);
        beneficiary.setStatus("VERIFIED");

        when(customerServiceClient.verifyKycApproved(userId)).thenReturn(customer);
        when(accountServiceClient.validateCustomerAccountEligible("ACC-1001", userId, "INR")).thenReturn(account);
        when(beneficiaryService.findEligibleBeneficiaryForTransfer(userId, "BEN-1")).thenReturn(beneficiary);
        when(feeAndLimitService.calculateFee(mode, amount))
                .thenReturn(new FeeCalculation(baseFee, tax, baseFee.add(tax), amount.add(baseFee).add(tax)));
        when(ledgerServiceClient.getAccountBalance("ACC-1001")).thenReturn(new LedgerBalanceDto(
                "ACC-1001", availableBalance, availableBalance, BigDecimal.ZERO, "INR", Instant.now()));
        lenient().when(payoutProvider.isPayoutAvailable()).thenReturn(true);
        lenient().when(payoutProvider.providerName()).thenReturn("RAZORPAYX");
        lenient().when(beneficiaryService.ensureFundAccountForTransfer(beneficiary, customer)).thenReturn("fa_1");
        lenient().when(ledgerServiceClient.postBatch(anyString(), any())).thenReturn(new LedgerPostingResponseDto(
                "TXN-LEDGER-1", "SUCCESS", amount.add(baseFee).add(tax), "INR", "LE-1", "LE-2",
                List.of("LE-1", "LE-2"), Instant.now()));
    }

    private InitiateTransferRequest bankTransferRequest(String mode, BigDecimal amount) {
        InitiateTransferRequest req = new InitiateTransferRequest();
        req.setDebitAccountId("ACC-1001");
        req.setBeneficiaryId("BEN-1");
        req.setAmount(amount);
        req.setCurrency("INR");
        req.setTransferMode(mode);
        req.setRemarks("Test transfer");
        return req;
    }
}
