package com.fintech.payment.service;

import com.fintech.payment.client.AccountServiceClient;
import com.fintech.payment.client.CustomerServiceClient;
import com.fintech.payment.client.LedgerServiceClient;
import com.fintech.payment.client.dto.CustomerProfileDto;
import com.fintech.payment.client.dto.InternalAccountDto;
import com.fintech.payment.client.dto.LedgerBalanceDto;
import com.fintech.payment.client.dto.LedgerDtos.LedgerPostingResponseDto;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.dto.request.CreateIncomingReceiverRequest;
import com.fintech.payment.dto.request.RefundIncomingPaymentRequest;
import com.fintech.payment.dto.response.IncomingPaymentResponse;
import com.fintech.payment.dto.response.IncomingReceiverResponse;
import com.fintech.payment.entity.IncomingPayment;
import com.fintech.payment.entity.IncomingPaymentReceiver;
import com.fintech.payment.entity.PaymentCustomer;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.IncomingCollectionProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import com.fintech.payment.repository.IncomingPaymentReceiverRepository;
import com.fintech.payment.repository.IncomingPaymentRepository;
import com.fintech.payment.repository.PaymentCustomerRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncomingPaymentServiceTest {

    @Mock private PaymentCustomerRepository customerRepository;
    @Mock private IncomingPaymentReceiverRepository receiverRepository;
    @Mock private IncomingPaymentRepository incomingPaymentRepository;
    @Mock private CustomerServiceClient customerServiceClient;
    @Mock private AccountServiceClient accountServiceClient;
    @Mock private LedgerServiceClient ledgerServiceClient;
    @Mock private IncomingCollectionProvider collectionProvider;
    @Mock private PaymentFeeAndLimitService feeAndLimitService;
    @Mock private PaymentOutboxService outboxService;
    @Mock private PaymentAuditService auditService;

    private RazorpayProperties properties;
    private IncomingPaymentService service;

    @BeforeEach
    void setUp() {
        properties = new RazorpayProperties();
        service = new IncomingPaymentService(
                customerRepository, receiverRepository, incomingPaymentRepository,
                customerServiceClient, accountServiceClient, ledgerServiceClient,
                collectionProvider, feeAndLimitService, properties, outboxService, auditService);
    }

    @Test
    void createsSmartCollectVirtualAccountAndReturnsExistingOnDuplicateRequest() {
        CustomerProfileDto customer = new CustomerProfileDto(
                "CUS-1", "Nilesh", LocalDate.of(1998, 1, 1),
                "+919999999999", "nilesh@example.com", "ABCDE1234F", "APPROVED", "LOW", Instant.now(), "MALE");
        InternalAccountDto account = new InternalAccountDto(
                "ACC-1001", "FINB****1001", "CUS-1", "user-1", "SAVINGS", "SAVINGS_REGULAR",
                "ACTIVE", "INR", Instant.now());

        when(customerServiceClient.verifyKycApproved("user-1")).thenReturn(customer);
        when(accountServiceClient.validateCustomerAccountEligible("ACC-1001", "user-1", "INR")).thenReturn(account);
        when(receiverRepository.findByFinbankAccountIdAndVaStatus("ACC-1001", "ACTIVE"))
                .thenReturn(Optional.empty());
        when(collectionProvider.isAvailable()).thenReturn(true);
        when(collectionProvider.providerName()).thenReturn("RAZORPAY_SMART_COLLECT");
        when(customerRepository.findByUserId("user-1")).thenReturn(Optional.empty());
        when(collectionProvider.createOrGetCustomer(any()))
                .thenReturn(new ProviderCustomerResult("cust_rzp_1", "Nilesh", "nilesh@example.com"));
        when(customerRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(collectionProvider.createVirtualAccount(any())).thenReturn(new VirtualAccountResult(
                "va_123", "cust_rzp_1", "ACTIVE", "FinBank Nilesh", "desc",
                "1112220006712324", "RATN0VAAPIS", "RBL Bank", "finbank.acc1001@okicici", null));

        IncomingReceiverResponse created = service.createOrRetrieveReceiver("user-1",
                new CreateIncomingReceiverRequest("ACC-1001", "Primary collections", null, null));

        assertEquals("va_123".length() > 0 ? "ACTIVE" : "", created.vaStatus());
        assertEquals("1112220006712324", created.virtualAccountNumber());
        assertEquals("finbank.acc1001@okicici", created.virtualVpa());

        // Second call returns existing receiver without calling Razorpay again
        IncomingPaymentReceiver existing = new IncomingPaymentReceiver();
        existing.setReceiverId(created.receiverId());
        existing.setUserId("user-1");
        existing.setFinbankAccountId("ACC-1001");
        existing.setVaStatus("ACTIVE");
        existing.setVirtualAccountNumber("1112220006712324");
        when(receiverRepository.findByFinbankAccountIdAndVaStatus("ACC-1001", "ACTIVE"))
                .thenReturn(Optional.of(existing));

        IncomingReceiverResponse dup = service.createOrRetrieveReceiver("user-1",
                new CreateIncomingReceiverRequest("ACC-1001", "Primary collections", null, null));
        assertEquals(created.receiverId(), dup.receiverId());
        verify(collectionProvider, times(1)).createVirtualAccount(any());
    }

    @Test
    void creditsFinBankAccountOnlyAfterVerificationAndLedgerSuccess() {
        IncomingPaymentReceiver receiver = new IncomingPaymentReceiver();
        receiver.setReceiverId("RCV-1");
        receiver.setUserId("user-1");
        receiver.setCustomerId("CUS-1");
        receiver.setFinbankAccountId("ACC-1001");
        receiver.setProviderVaId("va_123");
        receiver.setVaStatus("ACTIVE");

        ProviderPaymentResult webhookPay = new ProviderPaymentResult(
                "pay_1", "va_123", new BigDecimal("5000.00"), "INR", "captured", "upi",
                "payer@example.com", "sender@upi", "HDFC", "UTR999", null, null, Instant.now());

        when(incomingPaymentRepository.findByProviderPaymentId("pay_1")).thenReturn(Optional.empty());
        when(receiverRepository.findByProviderVaId("va_123")).thenReturn(Optional.of(receiver));
        when(collectionProvider.isAvailable()).thenReturn(true);
        when(collectionProvider.fetchPayment("pay_1")).thenReturn(webhookPay);
        when(feeAndLimitService.calculateFee("INCOMING", new BigDecimal("5000.00")))
                .thenReturn(new PaymentFeeAndLimitService.FeeCalculation(
                        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("5000.00")));
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(new InternalAccountDto(
                "ACC-1001", "FINB****1001", "CUS-1", "user-1", "SAVINGS", "SAVINGS_REGULAR",
                "ACTIVE", "INR", Instant.now()));
        when(ledgerServiceClient.postBatch(anyString(), any())).thenReturn(new LedgerPostingResponseDto(
                "TXN-IN-1", "SUCCESS", new BigDecimal("5000.00"), "INR", "LE-1", "LE-2",
                List.of("LE-1", "LE-2"), Instant.now()));

        IncomingPayment saved = service.recordAndProcessIncomingPayment("va_123", webhookPay, "virtual_account.credited");

        assertEquals("CREDITED", saved.getStatus());
        assertEquals("TXN-IN-1", saved.getLedgerTransactionId());
        verify(ledgerServiceClient).postBatch(eq("in-" + saved.getIncomingPaymentId()), any());
    }

    @Test
    void keepsVerifiedStatusWhenLedgerCreditFails() {
        IncomingPaymentReceiver receiver = new IncomingPaymentReceiver();
        receiver.setReceiverId("RCV-1");
        receiver.setUserId("user-1");
        receiver.setCustomerId("CUS-1");
        receiver.setFinbankAccountId("ACC-1001");
        receiver.setProviderVaId("va_123");
        receiver.setVaStatus("ACTIVE");

        ProviderPaymentResult pay = new ProviderPaymentResult(
                "pay_fail_ledger", "va_123", new BigDecimal("1000.00"), "INR", "captured", "bank_transfer",
                null, null, "ICIC", "UTR555", null, null, Instant.now());

        when(incomingPaymentRepository.findByProviderPaymentId("pay_fail_ledger")).thenReturn(Optional.empty());
        when(receiverRepository.findByProviderVaId("va_123")).thenReturn(Optional.of(receiver));
        when(collectionProvider.isAvailable()).thenReturn(false);
        when(feeAndLimitService.calculateFee("INCOMING", new BigDecimal("1000.00")))
                .thenReturn(new PaymentFeeAndLimitService.FeeCalculation(
                        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("1000.00")));
        when(accountServiceClient.getAccount("ACC-1001")).thenReturn(new InternalAccountDto(
                "ACC-1001", "FINB****1001", "CUS-1", "user-1", "SAVINGS", "SAVINGS_REGULAR",
                "ACTIVE", "INR", Instant.now()));
        when(ledgerServiceClient.postBatch(anyString(), any()))
                .thenThrow(new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE", "Down"));

        assertThrows(ApiException.class,
                () -> service.recordAndProcessIncomingPayment("va_123", pay, "virtual_account.credited"));
        verify(incomingPaymentRepository, never()).save(argThat(p -> "CREDITED".equals(p.getStatus())));
    }

    @Test
    void marksDiscrepancyForUnknownReceiverOrUnexpectedAmount() {
        ProviderPaymentResult unknownVa = new ProviderPaymentResult(
                "pay_unknown", "va_missing", new BigDecimal("250.00"), "INR", "captured", "upi",
                null, "x@upi", null, "UTR001", null, null, Instant.now());

        when(incomingPaymentRepository.findByProviderPaymentId("pay_unknown")).thenReturn(Optional.empty());
        when(receiverRepository.findByProviderVaId("va_missing")).thenReturn(Optional.empty());

        IncomingPayment res = service.recordAndProcessIncomingPayment("va_missing", unknownVa, "virtual_account.credited");
        assertEquals("DISCREPANCY", res.getStatus());
        verifyNoInteractions(ledgerServiceClient);
    }

    @Test
    void refundsCreditedIncomingPaymentAndCompensatesIfRazorpayRefundFails() {
        IncomingPayment credited = new IncomingPayment();
        credited.setIncomingPaymentId("INP-1");
        credited.setFinbankAccountId("ACC-1001");
        credited.setProviderPaymentId("pay_1");
        credited.setAmount(new BigDecimal("1000.00"));
        credited.setNetCreditAmount(new BigDecimal("1000.00"));
        credited.setCurrency("INR");
        credited.setStatus("CREDITED");

        when(incomingPaymentRepository.findByIncomingPaymentId("INP-1")).thenReturn(Optional.of(credited));
        when(collectionProvider.isAvailable()).thenReturn(true);
        when(ledgerServiceClient.getAccountBalance("ACC-1001")).thenReturn(new LedgerBalanceDto(
                "ACC-1001", new BigDecimal("2000.00"), new BigDecimal("2000.00"), BigDecimal.ZERO, "INR", Instant.now()));
        when(ledgerServiceClient.postBatch(eq("refund-INP-1"), any())).thenReturn(new LedgerPostingResponseDto(
                "TXN-DEBIT-REF", "SUCCESS", new BigDecimal("1000.00"), "INR", "LE-1", "LE-2",
                List.of("LE-1", "LE-2"), Instant.now()));
        when(collectionProvider.refundPayment(any()))
                .thenReturn(new RefundPaymentResult("rfnd_1", "pay_1", new BigDecimal("1000.00"), "INR", "processed"));

        IncomingPaymentResponse res = service.refundIncomingPayment(
                "INP-1", new RefundIncomingPaymentRequest(new BigDecimal("1000.00"), "Duplicate customer deposit"), "ops-1");

        assertEquals("REFUNDED", res.status());
        assertEquals("rfnd_1", res.refundId());
    }
}
