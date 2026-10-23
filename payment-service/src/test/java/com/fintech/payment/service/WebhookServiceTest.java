package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.repository.WebhookEventRepository;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WebhookServiceTest {

    private static final String SECRET = "payment-webhook-test-secret-at-least-32-bytes";
    private static final ValidatorFactory VALIDATOR_FACTORY = Validation.buildDefaultValidatorFactory();

    private final WebhookEventRepository webhookEventRepository = mock(WebhookEventRepository.class);
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final WebhookService webhookService = new WebhookService(
            webhookEventRepository,
            paymentRepository,
            new ObjectMapper().findAndRegisterModules(),
            VALIDATOR_FACTORY.getValidator(),
            SECRET);

    @AfterAll
    static void closeValidatorFactory() {
        VALIDATOR_FACTORY.close();
    }

    @Test
    void acceptsDocumentedSha256SignaturePrefixAndUpdatesPendingPayment() throws Exception {
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        byte[] payload = ("{\"railReference\":\"RAIL-123\",\"paymentReference\":\"PAY-123\","
                + "\"status\":\"SUCCESS\",\"statusReason\":\"COMPLETED\","
                + "\"completedAt\":\"" + Instant.now() + "\"}").getBytes(StandardCharsets.UTF_8);
        Payment payment = new Payment();
        payment.setPaymentId("PAY-123");
        payment.setStatus("PENDING");
        when(webhookEventRepository.existsByRailReference("RAIL-123")).thenReturn(false);
        when(paymentRepository.findByPaymentId("PAY-123")).thenReturn(Optional.of(payment));
        when(webhookEventRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        String signature = "sha256=" + sign(timestamp, payload);
        webhookService.processWebhook(signature, timestamp, payload);

        assertEquals("SUCCESS", payment.getStatus());
        verify(webhookEventRepository).saveAndFlush(any());
        verify(paymentRepository).save(payment);
    }

    @Test
    void rejectsTimestampAtLongMinimumInsteadOfAcceptingOverflow() {
        ApiException exception = assertThrows(ApiException.class,
                () -> webhookService.processWebhook("sha256=" + "0".repeat(64),
                        Long.toString(Long.MIN_VALUE), "{}".getBytes(StandardCharsets.UTF_8)));

        assertEquals("WEBHOOK_TIMESTAMP_EXPIRED", exception.getCode());
    }

    @Test
    void rejectsIncorrectSignatureWithDocumentedBadRequestStatus() {
        String timestamp = Long.toString(Instant.now().getEpochSecond());

        ApiException exception = assertThrows(ApiException.class,
                () -> webhookService.processWebhook("sha256=" + "0".repeat(64), timestamp,
                        "{}".getBytes(StandardCharsets.UTF_8)));

        assertEquals("INVALID_WEBHOOK_SIGNATURE", exception.getCode());
        assertEquals(400, exception.getHttpStatus().value());
    }

    private static String sign(String timestamp, byte[] payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        mac.update(timestamp.getBytes(StandardCharsets.UTF_8));
        mac.update((byte) '.');
        return HexFormat.of().formatHex(mac.doFinal(payload));
    }
}
