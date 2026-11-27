package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.entity.WebhookEvent;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.razorpay.RazorpayWebhookSignatureVerifier;
import com.fintech.payment.repository.WebhookEventRepository;
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
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebhookServiceTest {

    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private PaymentService paymentService;

    private RazorpayProperties properties;
    private WebhookService webhookService;

    @BeforeEach
    void setUp() {
        properties = new RazorpayProperties();
        properties.getWebhook().setSecret("whsec_test_secret");
        webhookService = new WebhookService(
                webhookEventRepository,
                new ObjectMapper(),
                properties,
                new RazorpayWebhookSignatureVerifier(),
                paymentService
        );
    }

    @Test
    void processWebhook_invalidSignatureRejected() {
        byte[] body = "{\"event\":\"payment.captured\"}".getBytes(StandardCharsets.UTF_8);
        ApiException ex = assertThrows(ApiException.class,
                () -> webhookService.processRazorpayWebhook("0".repeat(64), "evt_1", body));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_WEBHOOK_SIGNATURE", ex.getCode());
        verifyNoInteractions(paymentService);
    }

    @Test
    void processWebhook_duplicateEventIgnoredIdempotently() throws Exception {
        byte[] body = "{\"event\":\"payment.captured\"}".getBytes(StandardCharsets.UTF_8);
        String sig = sign(body, "whsec_test_secret");
        when(webhookEventRepository.existsByEventId("evt_dup")).thenReturn(true);

        WebhookResponse res = webhookService.processRazorpayWebhook(sig, "evt_dup", body);
        assertEquals("DUPLICATE_IGNORED", res.status());
        verifyNoInteractions(paymentService);
    }

    @Test
    void processWebhook_paymentCaptured_dispatchesToPaymentService() throws Exception {
        String json = """
                {"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1","order_id":"order_1","amount":250000,"currency":"INR","method":"upi"}}}}
                """;
        byte[] body = json.getBytes(StandardCharsets.UTF_8);
        String sig = sign(body, "whsec_test_secret");
        when(webhookEventRepository.existsByEventId("evt_cap_1")).thenReturn(false);
        when(webhookEventRepository.saveAndFlush(any(WebhookEvent.class))).thenAnswer(inv -> inv.getArgument(0));
        when(webhookEventRepository.save(any(WebhookEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        WebhookResponse res = webhookService.processRazorpayWebhook(sig, "evt_cap_1", body);

        assertEquals("PROCESSED", res.status());
        verify(paymentService).applyCapturedWebhook("order_1", "pay_1", "upi", new BigDecimal("2500.00"), "INR");
    }

    private String sign(byte[] payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(payload));
    }
}
