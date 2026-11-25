package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.entity.WebhookEvent;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.razorpay.RazorpayWebhookSignatureVerifier;
import com.fintech.payment.repository.IncomingPaymentReceiverRepository;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.repository.WebhookEventRepository;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebhookServiceRazorpayTest {

    private static final String SECRET = "razorpay-test-webhook-secret-32-bytes";
    private static final ValidatorFactory VALIDATOR_FACTORY = Validation.buildDefaultValidatorFactory();

    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private IncomingPaymentReceiverRepository receiverRepository;
    @Mock private IncomingPaymentService incomingPaymentService;
    @Mock private PaymentService paymentService;
    @Mock private BeneficiaryService beneficiaryService;

    private WebhookService webhookService;

    @AfterAll
    static void closeValidator() {
        VALIDATOR_FACTORY.close();
    }

    @BeforeEach
    void setUp() {
        RazorpayProperties props = new RazorpayProperties();
        props.getWebhook().setSecret(SECRET);
        props.getWebhook().setPayoutSecret(SECRET);
        webhookService = new WebhookService(
                webhookEventRepository, paymentRepository, receiverRepository,
                new ObjectMapper().findAndRegisterModules(), VALIDATOR_FACTORY.getValidator(),
                SECRET, props, new RazorpayWebhookSignatureVerifier(),
                incomingPaymentService, paymentService, beneficiaryService);
    }

    @Test
    void processesSmartCollectVirtualAccountCreditedWebhook() throws Exception {
        byte[] payload = """
                {
                  "entity": "event",
                  "event": "virtual_account.credited",
                  "payload": {
                    "virtual_account": { "entity": { "id": "va_123" } },
                    "payment": {
                      "entity": {
                        "id": "pay_123",
                        "amount": 10000,
                        "currency": "INR",
                        "status": "captured",
                        "method": "upi",
                        "vpa": "sender@okaxis",
                        "acquirer_data": { "utr": "UTR123456" },
                        "created_at": 1700000000
                      }
                    }
                  }
                }
                """.getBytes(StandardCharsets.UTF_8);

        when(webhookEventRepository.existsByEventId("evt_sc_1")).thenReturn(false);
        when(webhookEventRepository.saveAndFlush(any(WebhookEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        WebhookResponse res = webhookService.processRazorpaySmartCollectWebhook(sign(payload), "evt_sc_1", payload);

        assertTrue(res.isReceived());
        verify(incomingPaymentService).recordAndProcessIncomingPayment(
                eq("va_123"),
                argThat(p -> "pay_123".equals(p.providerPaymentId())
                        && p.amount().compareTo(new BigDecimal("100.00")) == 0
                        && "UTR123456".equals(p.utr())),
                eq("virtual_account.credited"));
    }

    @Test
    void rejectsInvalidRazorpaySignature() {
        byte[] payload = "{\"event\":\"payout.processed\"}".getBytes(StandardCharsets.UTF_8);
        ApiException ex = assertThrows(ApiException.class,
                () -> webhookService.processRazorpayXWebhook("0".repeat(64), "evt_bad", payload));
        assertEquals("INVALID_WEBHOOK_SIGNATURE", ex.getCode());
        verifyNoInteractions(paymentService);
    }

    @Test
    void handlesDuplicateWebhookIdempotently() throws Exception {
        byte[] payload = "{\"event\":\"payout.processed\",\"payload\":{\"payout\":{\"entity\":{\"id\":\"pout_1\",\"status\":\"processed\"}}}}"
                .getBytes(StandardCharsets.UTF_8);
        when(webhookEventRepository.existsByEventId("evt_dup")).thenReturn(true);

        WebhookResponse res = webhookService.processRazorpayXWebhook(sign(payload), "evt_dup", payload);

        assertTrue(res.isReceived());
        verifyNoInteractions(paymentService);
    }

    @Test
    void dispatchesRazorpayXPayoutAndValidationWebhooks() throws Exception {
        byte[] payoutPayload = """
                {
                  "event": "payout.processed",
                  "payload": {
                    "payout": {
                      "entity": {
                        "id": "pout_99",
                        "status": "processed",
                        "utr": "UTR9999"
                      }
                    }
                  }
                }
                """.getBytes(StandardCharsets.UTF_8);
        when(webhookEventRepository.existsByEventId("evt_px_1")).thenReturn(false);
        when(webhookEventRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        webhookService.processRazorpayXWebhook(sign(payoutPayload), "evt_px_1", payoutPayload);
        verify(paymentService).handlePayoutWebhookUpdate("pout_99", "processed", "UTR9999", null, null);

        byte[] valPayload = """
                {
                  "event": "fund_account.validation.completed",
                  "payload": {
                    "fund_account_validation": {
                      "entity": {
                        "id": "fav_99",
                        "fund_account_id": "fa_99",
                        "status": "completed",
                        "results": { "account_status": "active", "registered_name": "Priya Verma" }
                      }
                    }
                  }
                }
                """.getBytes(StandardCharsets.UTF_8);
        when(webhookEventRepository.existsByEventId("evt_val_1")).thenReturn(false);

        webhookService.processRazorpayXWebhook(sign(valPayload), "evt_val_1", valPayload);
        verify(beneficiaryService).processValidationWebhook(argThat(v ->
                "fav_99".equals(v.providerValidationId())
                        && "Priya Verma".equals(v.registeredName())));
    }

    private static String sign(byte[] payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(payload));
    }
}
