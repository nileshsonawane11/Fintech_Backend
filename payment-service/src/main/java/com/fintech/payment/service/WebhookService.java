package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.dto.request.PaymentRailWebhookRequest;
import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.entity.WebhookEvent;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.repository.WebhookEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Set;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);
    private static final long MAX_TIMESTAMP_SKEW_SECONDS = 300; // 5 minutes
    private static final int MAX_WEBHOOK_PAYLOAD_BYTES = 16 * 1024;

    private final WebhookEventRepository webhookEventRepository;
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;
    private final Validator validator;
    private final String webhookSecret;

    public WebhookService(WebhookEventRepository webhookEventRepository,
                          PaymentRepository paymentRepository,
                          ObjectMapper objectMapper,
                          Validator validator,
                          @Value("${payment.webhook.secret:}") String webhookSecret) {
        this.webhookEventRepository = webhookEventRepository;
        this.paymentRepository = paymentRepository;
        this.objectMapper = objectMapper;
        this.validator = validator;
        this.webhookSecret = webhookSecret;
    }

    @Transactional
    public WebhookResponse processWebhook(String signature, String timestampHeader,
                                          byte[] payload) {
        if (payload == null || payload.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is empty");
        }
        if (payload.length > MAX_WEBHOOK_PAYLOAD_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "WEBHOOK_PAYLOAD_TOO_LARGE", "Webhook payload exceeds the allowed size");
        }
        validateTimestamp(timestampHeader);
        validateSignature(signature, timestampHeader, payload);

        PaymentRailWebhookRequest request;
        try {
            request = objectMapper.readValue(payload, PaymentRailWebhookRequest.class);
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is not valid JSON");
        }
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is empty");
        }
        Set<ConstraintViolation<PaymentRailWebhookRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is invalid");
        }

        if (webhookEventRepository.existsByRailReference(request.getRailReference())) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_WEBHOOK",
                    "Webhook for rail reference already processed: " + request.getRailReference());
        }

        Payment payment = paymentRepository.findByPaymentId(request.getPaymentReference())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment reference does not match a pending payment"));

        if (!"PENDING".equals(payment.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_FINALIZED", "Payment has already reached a final state");
        }

        WebhookEvent event = new WebhookEvent();
        event.setRailReference(request.getRailReference());
        event.setPaymentReference(request.getPaymentReference());
        event.setStatus(request.getStatus());
        event.setStatusReason(request.getStatusReason());
        event.setCompletedAt(request.getCompletedAt());
        try {
            webhookEventRepository.saveAndFlush(event);
        } catch (DataIntegrityViolationException exception) {
            // The unique rail-reference constraint closes the race between
            // the duplicate lookup above and concurrent webhook delivery.
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_WEBHOOK", "Webhook for rail reference has already been processed");
        }

        payment.setStatus(request.getStatus());
        payment.setRailReference(request.getRailReference());
        payment.setCompletedAt(request.getCompletedAt() != null
                ? request.getCompletedAt() : Instant.now());
        paymentRepository.save(payment);

        return new WebhookResponse(true);
    }

    private void validateTimestamp(String timestampHeader) {
        if (timestampHeader == null || timestampHeader.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE", "Missing X-Timestamp header");
        }
        try {
            long webhookTimestamp = Long.parseLong(timestampHeader.trim());
            long nowEpoch = Instant.now().getEpochSecond();
            long earliestAllowed = nowEpoch - MAX_TIMESTAMP_SKEW_SECONDS;
            long latestAllowed = nowEpoch + MAX_TIMESTAMP_SKEW_SECONDS;
            if (webhookTimestamp < earliestAllowed || webhookTimestamp > latestAllowed) {
                throw new ApiException(HttpStatus.GONE, "WEBHOOK_TIMESTAMP_EXPIRED", "Webhook timestamp is too old or in the future");
            }
        } catch (NumberFormatException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE", "Invalid X-Timestamp header value");
        }
    }

    private void validateSignature(String signature, String timestamp, byte[] payload) {
        if (webhookSecret == null || webhookSecret.length() < 32) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "WEBHOOK_NOT_CONFIGURED", "Payment webhook verification is not configured");
        }
        String suppliedHex = signature == null ? null : signature.trim();
        if (suppliedHex != null && suppliedHex.regionMatches(true, 0, "sha256=", 0, 7)) {
            suppliedHex = suppliedHex.substring(7);
        }
        if (suppliedHex == null || !suppliedHex.matches("(?i)[0-9a-f]{64}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE", "Missing or malformed X-Signature header");
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            mac.update(timestamp.getBytes(StandardCharsets.UTF_8));
            mac.update((byte) '.');
            byte[] expected = mac.doFinal(payload);
            byte[] supplied = HexFormat.of().parseHex(suppliedHex);
            if (!MessageDigest.isEqual(expected, supplied)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature is invalid");
            }
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("Could not verify payment webhook signature", exception);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "WEBHOOK_VERIFICATION_FAILED", "Webhook signature could not be verified");
        }
    }
}
