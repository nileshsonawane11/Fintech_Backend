package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.client.AccountServiceClient;
import com.fintech.payment.client.CustomerServiceClient;
import com.fintech.payment.client.dto.InternalAccountDto;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.CreatePaymentOrderRequest;
import com.fintech.payment.dto.request.RefundPaymentRequest;
import com.fintech.payment.dto.request.VerifyPaymentRequest;
import com.fintech.payment.dto.response.PaymentOrderResponse;
import com.fintech.payment.dto.response.PaymentTransactionResponse;
import com.fintech.payment.dto.response.RefundResponse;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.entity.PaymentRefund;
import com.fintech.payment.enums.PaymentPurpose;
import com.fintech.payment.enums.PaymentTransactionStatus;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.RazorpayOrdersProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import com.fintech.payment.provider.razorpay.RazorpayCheckoutSignatureVerifier;
import com.fintech.payment.repository.PaymentRefundRepository;
import com.fintech.payment.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentRefundRepository refundRepository;
    @Mock private RazorpayOrdersProvider razorpayOrdersProvider;
    @Mock private AccountServiceClient accountServiceClient;
    @Mock private CustomerServiceClient customerServiceClient;
    @Mock private PaymentFeeAndLimitService limitService;
    @Mock private PaymentIdempotencyService idempotencyService;
    @Mock private PaymentOutboxService outboxService;
    @Mock private PaymentAuditService auditService;

    private RazorpayProperties properties;
    private RazorpayCheckoutSignatureVerifier signatureVerifier;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        properties = new RazorpayProperties();
        properties.setKeyId("rzp_test_public");
        properties.setKeySecret("rzp_test_secret");
        properties.setAutoCapture(true);
        signatureVerifier = new RazorpayCheckoutSignatureVerifier();

        paymentService = new PaymentService(
                paymentRepository,
                refundRepository,
                razorpayOrdersProvider,
                signatureVerifier,
                properties,
                accountServiceClient,
                customerServiceClient,
                limitService,
                idempotencyService,
                outboxService,
                auditService,
                new ObjectMapper()
        );
    }

    @Test
    void createOrder_internalTransferRejected() {
        CreatePaymentOrderRequest req = new CreatePaymentOrderRequest(
                PaymentPurpose.INTERNAL_TRANSFER, "ACC-2", null, new BigDecimal("500.00"), "INR", null);

        ApiException ex = assertThrows(ApiException.class,
                () -> paymentService.createOrder("sub-1", "11111111-1111-1111-1111-111111111111", req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INTERNAL_TRANSFER_NOT_RAZORPAY", ex.getCode());
        verifyNoInteractions(razorpayOrdersProvider);
    }

    @Test
    void createOrder_accountDeposit_success_doesNotExposeSecret() {
        String idemKey = "11111111-1111-1111-1111-111111111111";
        when(idempotencyService.checkOrLock(eq(idemKey), eq("CREATE_PAYMENT_ORDER"), eq("sub-1"),
                eq("PENDING"), any(), eq(PaymentOrderResponse.class)))
                .thenReturn(Optional.empty());
        when(accountServiceClient.validateCustomerAccountEligible("ACC-100", "sub-1", "INR"))
                .thenReturn(new InternalAccountDto("ACC-100", "XXXX1234", "CUST-1", "sub-1",
                        "SAVINGS", "SAV_REG", "ACTIVE", "INR", Instant.now()));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(razorpayOrdersProvider.createOrder(any())).thenReturn(new RazorpayOrderResult(
                "order_RZP_001", new BigDecimal("2500.00"), BigDecimal.ZERO, new BigDecimal("2500.00"),
                "INR", "PAY-1", "created", 0, Instant.now()));

        PaymentOrderResponse res = paymentService.createOrder("sub-1", idemKey,
                new CreatePaymentOrderRequest(PaymentPurpose.ACCOUNT_DEPOSIT, "ACC-100", null,
                        new BigDecimal("2500.00"), "INR", Map.of()));

        assertEquals("order_RZP_001", res.razorpayOrderId());
        assertEquals("rzp_test_public", res.keyId());
        assertEquals(250000L, res.amountPaise());
        assertEquals(PaymentTransactionStatus.ORDER_CREATED, res.status());
        verify(outboxService).enqueueEvent(eq(PaymentConstants.TOPIC_INCOMING_EVENTS),
                anyString(), eq("Payment"), eq(PaymentConstants.EVT_PAYMENT_ORDER_CREATED),
                eq("sub-1"), eq("order_RZP_001"), any());
    }

    @Test
    void verifyCheckoutPayment_crossCustomerAccessForbidden() {
        Payment p = sampleOrder("PAY-1", "sub-owner", "order_1", new BigDecimal("1000.00"));
        when(paymentRepository.findByRazorpayOrderId("order_1")).thenReturn(Optional.of(p));

        ApiException ex = assertThrows(ApiException.class,
                () -> paymentService.verifyCheckoutPayment("sub-attacker",
                        new VerifyPaymentRequest("order_1", "pay_1", "0".repeat(64))));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("PAYMENT_OWNERSHIP_MISMATCH", ex.getCode());
    }

    @Test
    void verifyCheckoutPayment_incorrectSignatureRejected() {
        Payment p = sampleOrder("PAY-1", "sub-1", "order_1", new BigDecimal("1000.00"));
        when(paymentRepository.findByRazorpayOrderId("order_1")).thenReturn(Optional.of(p));

        ApiException ex = assertThrows(ApiException.class,
                () -> paymentService.verifyCheckoutPayment("sub-1",
                        new VerifyPaymentRequest("order_1", "pay_1", "0".repeat(64))));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_PAYMENT_SIGNATURE", ex.getCode());
    }

    @Test
    void verifyCheckoutPayment_manualCapture_capturesAuthorizedAndPublishesDepositEvent() throws Exception {
        properties.setAutoCapture(false);
        Payment p = sampleOrder("PAY-1", "sub-1", "order_1", new BigDecimal("1000.00"));
        when(paymentRepository.findByRazorpayOrderId("order_1")).thenReturn(Optional.of(p));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        String sig = sign("order_1|pay_1", properties.getKeySecret());
        when(razorpayOrdersProvider.fetchPayment("pay_1")).thenReturn(new RazorpayPaymentResult(
                "pay_1", "order_1", new BigDecimal("1000.00"), "INR", "authorized", "card", false,
                null, null, null, null, Instant.now()));
        when(razorpayOrdersProvider.capturePayment(any())).thenReturn(new RazorpayPaymentResult(
                "pay_1", "order_1", new BigDecimal("1000.00"), "INR", "captured", "card", true,
                null, null, null, null, Instant.now()));

        PaymentTransactionResponse res = paymentService.verifyCheckoutPayment("sub-1",
                new VerifyPaymentRequest("order_1", "pay_1", sig));

        assertEquals(PaymentTransactionStatus.PROCESSING, res.status());
        assertTrue(res.razorpaySignatureVerified());
        verify(razorpayOrdersProvider).capturePayment(any());
        verify(outboxService).enqueueEvent(eq(PaymentConstants.TOPIC_INCOMING_EVENTS),
                eq("PAY-1"), eq("Payment"), eq(PaymentConstants.EVT_EXTERNAL_DEPOSIT_CONFIRMED),
                eq("sub-1"), eq("pay_1"), any());
    }

    @Test
    void initiateRefund_partialRefund_success() {
        Payment p = sampleOrder("PAY-1", "sub-1", "order_1", new BigDecimal("1000.00"));
        p.setRazorpayPaymentId("pay_1");
        p.setStatus(PaymentTransactionStatus.COMPLETED);
        when(refundRepository.findByIdempotencyKey("ref-1")).thenReturn(Optional.empty());
        when(paymentRepository.findByPaymentId("PAY-1")).thenReturn(Optional.of(p));
        when(refundRepository.save(any(PaymentRefund.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(razorpayOrdersProvider.refundPayment(any())).thenReturn(new RazorpayRefundResult(
                "rfnd_99", "pay_1", new BigDecimal("400.00"), "INR", "processed", Instant.now()));

        RefundResponse res = paymentService.initiateRefund("sub-1", "ref-1", "PAY-1",
                new RefundPaymentRequest(new BigDecimal("400.00"), "Customer partial refund"), false);

        assertEquals("PROCESSED", res.status());
        assertEquals(PaymentTransactionStatus.PARTIALLY_REFUNDED, p.getStatus());
        assertEquals(new BigDecimal("400.0000"), p.getRefundedAmount());
        verify(outboxService).enqueueEvent(eq(PaymentConstants.TOPIC_INCOMING_EVENTS),
                eq("PAY-1"), eq("Payment"), eq(PaymentConstants.EVT_PAYMENT_REFUNDED),
                eq("sub-1"), eq("rfnd_99"), any());
    }

    private Payment sampleOrder(String paymentId, String subject, String orderId, BigDecimal amount) {
        Payment p = new Payment();
        p.setPaymentId(paymentId);
        p.setIdentitySubject(subject);
        p.setDestinationAccountId("ACC-100");
        p.setPurpose(PaymentPurpose.ACCOUNT_DEPOSIT);
        p.setAmount(amount.setScale(4));
        p.setCurrency("INR");
        p.setStatus(PaymentTransactionStatus.ORDER_CREATED);
        p.setRazorpayOrderId(orderId);
        return p;
    }

    private String sign(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }
}
