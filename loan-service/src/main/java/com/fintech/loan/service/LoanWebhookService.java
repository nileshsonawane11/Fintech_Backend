package com.fintech.loan.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.loan.entity.LoanWebhookEvent;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanWebhookEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

@Service
public class LoanWebhookService {

    private static final Logger log = LoggerFactory.getLogger(LoanWebhookService.class);

    private final LoanWebhookEventRepository webhookEventRepository;
    private final LoanRepaymentService repaymentService;
    private final RepaymentMandateService mandateService;
    private final ObjectMapper objectMapper;
    private final String webhookSecret;

    public LoanWebhookService(
            LoanWebhookEventRepository webhookEventRepository,
            LoanRepaymentService repaymentService,
            RepaymentMandateService mandateService,
            ObjectMapper objectMapper,
            @Value("${app.payment.webhook-secret:finbank-webhook-secret}") String webhookSecret) {
        this.webhookEventRepository = webhookEventRepository;
        this.repaymentService = repaymentService;
        this.mandateService = mandateService;
        this.objectMapper = objectMapper;
        this.webhookSecret = webhookSecret;
    }

    @Transactional
    public Map<String, Object> processPaymentWebhook(
            String provider, String signature, String eventId, byte[] rawBody) {
        verifySignature(signature, rawBody);
        String effectiveEventId = resolveEventId(eventId, rawBody);

        if (webhookEventRepository.existsByProviderAndEventId(provider.toUpperCase(), effectiveEventId)) {
            return Map.of("status", "DUPLICATE_IGNORED", "eventId", effectiveEventId);
        }

        try {
            JsonNode root = objectMapper.readTree(rawBody);
            String eventType = root.path("event").asText("payment.unknown");
            String collectionRef = root.path("collectionReference").asText(
                    root.path("payload").path("payment").path("entity").path("notes").path("collectionReference").asText(""));
            String providerRef = root.path("providerReference").asText(
                    root.path("payload").path("payment").path("entity").path("id").asText(""));
            String failureCode = root.path("failureCode").asText(null);
            String failureReason = root.path("failureReason").asText(null);

            String outcome = switch (eventType.toLowerCase()) {
                case "payment.captured", "payment.succeeded", "collection.succeeded" -> "SUCCESS";
                case "payment.failed", "collection.failed" -> "FAILED";
                case "refund.processed", "payment.reversed" -> "REVERSED";
                default -> root.path("status").asText("PENDING");
            };

            repaymentService.processExternalCollectionOutcome(
                    collectionRef, outcome, providerRef, failureCode, failureReason);

            recordWebhook(provider, effectiveEventId, eventType, collectionRef, rawBody, "PROCESSED");
            return Map.of("status", "PROCESSED", "eventId", effectiveEventId, "outcome", outcome);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to parse payment webhook from provider={}: {}", provider, ex.getMessage());
            throw ApiException.badRequest("INVALID_WEBHOOK_PAYLOAD", "Malformed payment webhook payload.");
        }
    }

    @Transactional
    public Map<String, Object> processMandateWebhook(
            String provider, String signature, String eventId, byte[] rawBody) {
        verifySignature(signature, rawBody);
        String effectiveEventId = resolveEventId(eventId, rawBody);

        if (webhookEventRepository.existsByProviderAndEventId(provider.toUpperCase(), effectiveEventId)) {
            return Map.of("status", "DUPLICATE_IGNORED", "eventId", effectiveEventId);
        }

        try {
            JsonNode root = objectMapper.readTree(rawBody);
            String eventType = root.path("event").asText("mandate.unknown");
            String providerRef = root.path("providerReference").asText("");
            String failureReason = root.path("failureReason").asText(null);

            String newStatus = switch (eventType.toLowerCase()) {
                case "mandate.activated", "token.confirmed" -> "ACTIVE";
                case "mandate.paused" -> "PAUSED";
                case "mandate.revoked", "token.cancelled" -> "REVOKED";
                case "mandate.expired" -> "EXPIRED";
                case "mandate.failed", "token.rejected" -> "FAILED";
                default -> root.path("status").asText("PENDING");
            };

            mandateService.handleExternalMandateStatusUpdate(providerRef, newStatus, failureReason);
            recordWebhook(provider, effectiveEventId, eventType, providerRef, rawBody, "PROCESSED");
            return Map.of("status", "PROCESSED", "eventId", effectiveEventId, "mandateStatus", newStatus);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.badRequest("INVALID_WEBHOOK_PAYLOAD", "Malformed mandate webhook payload.");
        }
    }

    public void verifySignature(String signature, byte[] rawBody) {
        if (signature == null || signature.isBlank()) {
            throw ApiException.badRequest("MISSING_WEBHOOK_SIGNATURE", "Webhook signature header is required.");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal(rawBody));
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                    signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8))) {
                throw ApiException.badRequest("INVALID_WEBHOOK_SIGNATURE", "Webhook signature verification failed.");
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.badRequest("SIGNATURE_CHECK_FAILED", "Unable to verify webhook signature.");
        }
    }

    private String resolveEventId(String headerEventId, byte[] rawBody) {
        if (headerEventId != null && !headerEventId.isBlank()) {
            return headerEventId.trim();
        }
        return sha256(rawBody);
    }

    private void recordWebhook(String provider, String eventId, String eventType,
                               String referenceId, byte[] rawBody, String status) {
        LoanWebhookEvent event = new LoanWebhookEvent();
        event.setProvider(provider.toUpperCase());
        event.setEventId(eventId);
        event.setEventType(eventType);
        event.setReferenceId(referenceId);
        event.setPayloadHash(sha256(rawBody));
        event.setStatus(status);
        webhookEventRepository.save(event);
    }

    private String sha256(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(data));
        } catch (Exception ex) {
            return String.valueOf(data.length);
        }
    }
}
