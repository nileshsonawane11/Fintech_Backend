package com.fintech.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.entity.WebhookEvent;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.WebhookSignatureVerifier;
import com.fintech.payment.provider.razorpay.RazorpayMoneyUtils;
import com.fintech.payment.repository.WebhookEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    private final WebhookEventRepository webhookEventRepository;
    private final ObjectMapper objectMapper;
    private final RazorpayProperties razorpayProperties;
    private final WebhookSignatureVerifier signatureVerifier;
    private final PaymentService paymentService;

    public WebhookService(
            WebhookEventRepository webhookEventRepository,
            ObjectMapper objectMapper,
            RazorpayProperties razorpayProperties,
            WebhookSignatureVerifier signatureVerifier,
            PaymentService paymentService) {
        this.webhookEventRepository = webhookEventRepository;
        this.objectMapper = objectMapper;
        this.razorpayProperties = razorpayProperties;
        this.signatureVerifier = signatureVerifier;
        this.paymentService = paymentService;
    }

    @Transactional
    public WebhookResponse processRazorpayWebhook(String signature, String eventIdHeader, byte[] payload) {
        validateRawPayload(payload);

        String secret = razorpayProperties.getWebhook().getSecret();
        if (!signatureVerifier.verifySignature(payload, signature, secret)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE",
                    "Razorpay webhook signature verification failed");
        }

        JsonNode root = parseJson(payload);
        String eventType = root.path("event").asText("");
        if (eventType.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD",
                    "Razorpay webhook payload is missing event type");
        }

        String eventId = (eventIdHeader != null && !eventIdHeader.isBlank())
                ? eventIdHeader.trim()
                : deriveDeterministicEventId(payload);

        if (webhookEventRepository.existsByEventId(eventId)) {
            return new WebhookResponse(eventId, eventType, "DUPLICATE_IGNORED",
                    "Webhook event already processed", Instant.now());
        }

        WebhookEvent inbox = new WebhookEvent();
        inbox.setEventId(eventId);
        inbox.setEventType(eventType);
        inbox.setProvider(PaymentConstants.PROVIDER_RAZORPAY);
        inbox.setPayloadJson(new String(payload, StandardCharsets.UTF_8));
        inbox.setSignatureVerified(true);
        inbox.setProcessingStatus("RECEIVED");
        inbox.setReceivedAt(Instant.now());
        try {
            webhookEventRepository.saveAndFlush(inbox);
        } catch (DataIntegrityViolationException ex) {
            return new WebhookResponse(eventId, eventType, "DUPLICATE_IGNORED",
                    "Webhook event already processed", Instant.now());
        }

        try {
            dispatchRazorpayEvent(eventType, root);
            inbox.setProcessingStatus("PROCESSED");
            inbox.setProcessedAt(Instant.now());
            webhookEventRepository.save(inbox);
            return new WebhookResponse(eventId, eventType, "PROCESSED",
                    "Razorpay webhook processed", inbox.getProcessedAt());
        } catch (ApiException ex) {
            if (ex.getStatus() == HttpStatus.NOT_FOUND) {
                log.warn("Razorpay webhook target not found yet: eventId={}, eventType={}, msg={}",
                        eventId, eventType, ex.getMessage());
                inbox.setProcessingStatus("IGNORED");
                inbox.setErrorMessage(ex.getMessage());
                inbox.setProcessedAt(Instant.now());
                webhookEventRepository.save(inbox);
                return new WebhookResponse(eventId, eventType, "IGNORED",
                        ex.getMessage(), inbox.getProcessedAt());
            }
            inbox.setProcessingStatus("FAILED");
            inbox.setErrorMessage(truncate(ex.getMessage()));
            webhookEventRepository.save(inbox);
            throw ex;
        } catch (RuntimeException ex) {
            inbox.setProcessingStatus("FAILED");
            inbox.setErrorMessage(truncate(ex.getMessage()));
            webhookEventRepository.save(inbox);
            throw ex;
        }
    }

    private void dispatchRazorpayEvent(String eventType, JsonNode root) {
        JsonNode paymentEntity = root.path("payload").path("payment").path("entity");
        JsonNode orderEntity = root.path("payload").path("order").path("entity");
        JsonNode refundEntity = root.path("payload").path("refund").path("entity");

        switch (eventType) {
            case PaymentConstants.RZP_EVENT_PAYMENT_AUTHORIZED -> {
                String orderId = textOrNull(paymentEntity, "order_id");
                String paymentId = textOrNull(paymentEntity, "id");
                String method = textOrNull(paymentEntity, "method");
                BigDecimal amount = RazorpayMoneyUtils.fromPaise(paymentEntity.path("amount").asLong(0L));
                String currency = paymentEntity.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY);
                paymentService.applyAuthorizedWebhook(orderId, paymentId, method, amount, currency);
            }
            case PaymentConstants.RZP_EVENT_PAYMENT_CAPTURED -> {
                String orderId = textOrNull(paymentEntity, "order_id");
                String paymentId = textOrNull(paymentEntity, "id");
                String method = textOrNull(paymentEntity, "method");
                BigDecimal amount = RazorpayMoneyUtils.fromPaise(paymentEntity.path("amount").asLong(0L));
                String currency = paymentEntity.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY);
                paymentService.applyCapturedWebhook(orderId, paymentId, method, amount, currency);
            }
            case PaymentConstants.RZP_EVENT_ORDER_PAID -> {
                String orderId = textOrNull(orderEntity, "id");
                String paymentId = textOrNull(paymentEntity, "id");
                String method = textOrNull(paymentEntity, "method");
                BigDecimal amount = RazorpayMoneyUtils.fromPaise(
                        paymentEntity.hasNonNull("amount")
                                ? paymentEntity.path("amount").asLong(0L)
                                : orderEntity.path("amount_paid").asLong(0L));
                String currency = orderEntity.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY);
                paymentService.applyCapturedWebhook(orderId, paymentId, method, amount, currency);
            }
            case PaymentConstants.RZP_EVENT_PAYMENT_FAILED -> {
                String orderId = textOrNull(paymentEntity, "order_id");
                String paymentId = textOrNull(paymentEntity, "id");
                String failureCode = textOrNull(paymentEntity, "error_code");
                String failureReason = textOrNull(paymentEntity, "error_description");
                paymentService.applyFailedWebhook(orderId, paymentId, failureCode, failureReason);
            }
            case PaymentConstants.RZP_EVENT_REFUND_CREATED,
                 PaymentConstants.RZP_EVENT_REFUND_PROCESSED,
                 PaymentConstants.RZP_EVENT_REFUND_FAILED -> {
                String paymentId = textOrNull(refundEntity, "payment_id");
                String refundId = textOrNull(refundEntity, "id");
                BigDecimal amount = RazorpayMoneyUtils.fromPaise(refundEntity.path("amount").asLong(0L));
                paymentService.applyRefundWebhook(paymentId, refundId, amount, eventType);
            }
            default -> log.info("Ignoring unsupported Razorpay webhook eventType={}", eventType);
        }
    }

    private void validateRawPayload(byte[] payload) {
        if (payload == null || payload.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is empty");
        }
        if (payload.length > PaymentConstants.MAX_WEBHOOK_PAYLOAD_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "WEBHOOK_PAYLOAD_TOO_LARGE",
                    "Webhook payload exceeds allowed size");
        }
    }

    private JsonNode parseJson(byte[] payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD",
                    "Webhook payload is not valid JSON");
        }
    }

    private String deriveDeterministicEventId(byte[] payload) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return "RZP-EVT-" + HexFormat.of().formatHex(md.digest(payload)).substring(0, 32);
        } catch (Exception ex) {
            return "RZP-EVT-" + Integer.toHexString(java.util.Arrays.hashCode(payload));
        }
    }

    private String textOrNull(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || !node.hasNonNull(field)) {
            return null;
        }
        String val = node.get(field).asText();
        return val.isBlank() ? null : val;
    }

    private String truncate(String msg) {
        if (msg == null) {
            return null;
        }
        return msg.length() > 480 ? msg.substring(0, 480) : msg;
    }
}
