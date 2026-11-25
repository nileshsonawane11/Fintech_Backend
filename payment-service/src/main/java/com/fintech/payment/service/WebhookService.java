package com.fintech.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.PaymentRailWebhookRequest;
import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.entity.WebhookEvent;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.WebhookSignatureVerifier;
import com.fintech.payment.provider.model.ProviderModels.ProviderPaymentResult;
import com.fintech.payment.provider.model.ProviderModels.ValidationResult;
import com.fintech.payment.provider.razorpay.RazorpayMoneyUtils;
import com.fintech.payment.provider.razorpay.RazorpayWebhookSignatureVerifier;
import com.fintech.payment.repository.IncomingPaymentReceiverRepository;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.repository.WebhookEventRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Set;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);
    private static final long MAX_TIMESTAMP_SKEW_SECONDS = 300;
    private static final int MAX_LEGACY_WEBHOOK_PAYLOAD_BYTES = 16 * 1024;

    private final WebhookEventRepository webhookEventRepository;
    private final PaymentRepository paymentRepository;
    private final IncomingPaymentReceiverRepository receiverRepository;
    private final ObjectMapper objectMapper;
    private final Validator validator;
    private final String legacyWebhookSecret;
    private final RazorpayProperties razorpayProperties;
    private final WebhookSignatureVerifier signatureVerifier;
    private final IncomingPaymentService incomingPaymentService;
    private final PaymentService paymentService;
    private final BeneficiaryService beneficiaryService;

    public WebhookService(WebhookEventRepository webhookEventRepository,
                          PaymentRepository paymentRepository,
                          ObjectMapper objectMapper,
                          Validator validator,
                          @Value("${payment.webhook.secret:}") String webhookSecret) {
        this(webhookEventRepository, paymentRepository, null, objectMapper, validator, webhookSecret,
                new RazorpayProperties(), new RazorpayWebhookSignatureVerifier(), null, null, null);
    }

    @Autowired
    public WebhookService(
            WebhookEventRepository webhookEventRepository,
            PaymentRepository paymentRepository,
            IncomingPaymentReceiverRepository receiverRepository,
            ObjectMapper objectMapper,
            Validator validator,
            @Value("${payment.webhook.secret:}") String legacyWebhookSecret,
            RazorpayProperties razorpayProperties,
            WebhookSignatureVerifier signatureVerifier,
            IncomingPaymentService incomingPaymentService,
            PaymentService paymentService,
            BeneficiaryService beneficiaryService) {
        this.webhookEventRepository = webhookEventRepository;
        this.paymentRepository = paymentRepository;
        this.receiverRepository = receiverRepository;
        this.objectMapper = objectMapper;
        this.validator = validator;
        this.legacyWebhookSecret = legacyWebhookSecret;
        this.razorpayProperties = razorpayProperties;
        this.signatureVerifier = signatureVerifier;
        this.incomingPaymentService = incomingPaymentService;
        this.paymentService = paymentService;
        this.beneficiaryService = beneficiaryService;
    }

    /**
     * Legacy signed payment-rail webhook preserved for existing integrations & test coverage.
     */
    @Transactional
    public WebhookResponse processWebhook(String signature, String timestampHeader, byte[] payload) {
        if (payload == null || payload.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is empty");
        }
        if (payload.length > MAX_LEGACY_WEBHOOK_PAYLOAD_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "WEBHOOK_PAYLOAD_TOO_LARGE",
                    "Webhook payload exceeds the allowed size");
        }
        validateTimestamp(timestampHeader);
        validateLegacySignature(signature, timestampHeader, payload);

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
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment reference does not match a pending payment"));

        if (!"PENDING".equals(payment.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_FINALIZED",
                    "Payment has already reached a final state");
        }

        WebhookEvent event = new WebhookEvent();
        event.setEventId("LEGACY-" + request.getRailReference());
        event.setProvider("PAYMENT_RAIL");
        event.setEventType("payment.rail.status");
        event.setEntityId(request.getPaymentReference());
        event.setRailReference(request.getRailReference());
        event.setPaymentReference(request.getPaymentReference());
        event.setStatus(request.getStatus());
        event.setStatusReason(request.getStatusReason());
        event.setSignatureVerified(true);
        event.setProcessingStatus("PROCESSED");
        event.setCompletedAt(request.getCompletedAt());
        event.setProcessedAt(Instant.now());
        try {
            webhookEventRepository.saveAndFlush(event);
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_WEBHOOK",
                    "Webhook for rail reference has already been processed");
        }

        payment.setStatus(request.getStatus());
        payment.setRailReference(request.getRailReference());
        payment.setCompletedAt(request.getCompletedAt() != null ? request.getCompletedAt() : Instant.now());
        paymentRepository.save(payment);

        return new WebhookResponse(true);
    }

    @Transactional
    public WebhookResponse processRazorpaySmartCollectWebhook(
            String signatureHeader, String eventIdHeader, byte[] rawPayload) {
        String secret = razorpayProperties.getWebhook().getSecret();
        if ((secret == null || secret.isBlank()) && legacyWebhookSecret != null) {
            secret = legacyWebhookSecret;
        }
        return processRazorpayWebhookInternal(
                PaymentConstants.PROVIDER_RAZORPAY_SMART_COLLECT, signatureHeader, eventIdHeader, rawPayload, secret);
    }

    @Transactional
    public WebhookResponse processRazorpayXWebhook(
            String signatureHeader, String eventIdHeader, byte[] rawPayload) {
        String secret = razorpayProperties.getWebhook().getPayoutSecret();
        if ((secret == null || secret.isBlank())) {
            secret = razorpayProperties.getWebhook().getSecret();
        }
        if ((secret == null || secret.isBlank()) && legacyWebhookSecret != null) {
            secret = legacyWebhookSecret;
        }
        return processRazorpayWebhookInternal(
                PaymentConstants.PROVIDER_RAZORPAYX, signatureHeader, eventIdHeader, rawPayload, secret);
    }

    private WebhookResponse processRazorpayWebhookInternal(
            String provider, String signatureHeader, String eventIdHeader, byte[] rawPayload, String secret) {
        if (rawPayload == null || rawPayload.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is empty");
        }
        if (rawPayload.length > PaymentConstants.MAX_WEBHOOK_PAYLOAD_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "WEBHOOK_PAYLOAD_TOO_LARGE",
                    "Webhook payload exceeds allowed size");
        }
        if (!signatureVerifier.verifySignature(rawPayload, signatureHeader, secret)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE",
                    "Razorpay webhook signature verification failed");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(rawPayload);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook payload is not valid JSON");
        }

        String eventType = root.path("event").asText("");
        if (eventType.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "Webhook event field is missing");
        }

        String entityId = extractPrimaryEntityId(root, eventType);
        String eventId = (eventIdHeader != null && !eventIdHeader.isBlank())
                ? eventIdHeader.trim()
                : deriveDeterministicEventId(eventType, entityId, rawPayload);

        if (webhookEventRepository.existsByEventId(eventId)) {
            log.info("Duplicate Razorpay webhook ignored idempotently: eventId={}, eventType={}", eventId, eventType);
            return new WebhookResponse(true);
        }

        WebhookEvent record = new WebhookEvent();
        record.setEventId(eventId);
        record.setProvider(provider);
        record.setEventType(eventType);
        record.setEntityId(entityId);
        record.setRailReference(entityId);
        record.setPayloadJson(new String(rawPayload, StandardCharsets.UTF_8));
        record.setSignatureVerified(true);
        record.setProcessingStatus("PROCESSING");
        try {
            webhookEventRepository.saveAndFlush(record);
        } catch (DataIntegrityViolationException ex) {
            log.info("Concurrent duplicate Razorpay webhook ignored idempotently: eventId={}", eventId);
            return new WebhookResponse(true);
        }

        try {
            dispatchRazorpayEvent(eventType, root);
            record.setProcessingStatus("PROCESSED");
            record.setProcessedAt(Instant.now());
            webhookEventRepository.save(record);
        } catch (Exception ex) {
            record.setProcessingStatus("FAILED");
            record.setErrorMessage(ex.getMessage() != null && ex.getMessage().length() > 490
                    ? ex.getMessage().substring(0, 490) : ex.getMessage());
            record.setProcessedAt(Instant.now());
            webhookEventRepository.save(record);
            throw ex;
        }
        return new WebhookResponse(true);
    }

    private void dispatchRazorpayEvent(String eventType, JsonNode root) {
        JsonNode payload = root.path("payload");
        switch (eventType) {
            case PaymentConstants.RZP_EVENT_VA_CREDITED,
                 PaymentConstants.RZP_EVENT_PAYMENT_CAPTURED,
                 PaymentConstants.RZP_EVENT_PAYMENT_FAILED -> {
                JsonNode vaEntity = payload.path("virtual_account").path("entity");
                JsonNode payEntity = payload.path("payment").path("entity");
                if (payEntity.isMissingNode() || !payEntity.hasNonNull("id")) {
                    return;
                }
                String vaId = vaEntity.path("id").asText(null);
                if ((vaId == null || vaId.isBlank()) && payEntity.hasNonNull("virtual_account_id")) {
                    vaId = payEntity.get("virtual_account_id").asText();
                }
                BigDecimal amount = RazorpayMoneyUtils.fromPaise(payEntity.path("amount").asLong(0L));
                String utr = payEntity.path("acquirer_data").path("utr").asText(null);
                if (utr == null || utr.isBlank()) {
                    utr = payEntity.path("acquirer_data").path("rrn").asText(null);
                }
                Instant createdAt = payEntity.hasNonNull("created_at")
                        ? Instant.ofEpochSecond(payEntity.get("created_at").asLong()) : Instant.now();

                ProviderPaymentResult paymentResult = new ProviderPaymentResult(
                        payEntity.path("id").asText(),
                        vaId,
                        amount,
                        payEntity.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY),
                        payEntity.path("status").asText(""),
                        payEntity.path("method").asText(""),
                        payEntity.path("email").asText(null),
                        payEntity.path("vpa").asText(null),
                        payEntity.path("bank").asText(null),
                        utr,
                        payEntity.path("error_code").asText(null),
                        payEntity.path("error_description").asText(null),
                        createdAt
                );
                if (incomingPaymentService != null) {
                    incomingPaymentService.recordAndProcessIncomingPayment(vaId, paymentResult, eventType);
                }
            }
            case PaymentConstants.RZP_EVENT_VA_CLOSED -> {
                String vaId = payload.path("virtual_account").path("entity").path("id").asText(null);
                if (vaId != null && receiverRepository != null) {
                    receiverRepository.findByProviderVaId(vaId).ifPresent(rcv -> {
                        rcv.setVaStatus("CLOSED");
                        rcv.setClosedAt(Instant.now());
                        receiverRepository.save(rcv);
                    });
                }
            }
            case PaymentConstants.RZP_EVENT_REFUND_PROCESSED,
                 PaymentConstants.RZP_EVENT_REFUND_FAILED -> {
                JsonNode refundEntity = payload.path("refund").path("entity");
                if (!refundEntity.isMissingNode() && incomingPaymentService != null) {
                    incomingPaymentService.handleRefundWebhook(
                            refundEntity.path("payment_id").asText(null),
                            refundEntity.path("id").asText(null),
                            RazorpayMoneyUtils.fromPaise(refundEntity.path("amount").asLong(0L)),
                            refundEntity.path("status").asText("")
                    );
                }
            }
            case PaymentConstants.RZP_EVENT_PAYOUT_QUEUED,
                 PaymentConstants.RZP_EVENT_PAYOUT_PENDING,
                 PaymentConstants.RZP_EVENT_PAYOUT_INITIATED,
                 PaymentConstants.RZP_EVENT_PAYOUT_PROCESSED,
                 PaymentConstants.RZP_EVENT_PAYOUT_UPDATED,
                 PaymentConstants.RZP_EVENT_PAYOUT_FAILED,
                 PaymentConstants.RZP_EVENT_PAYOUT_REVERSED,
                 PaymentConstants.RZP_EVENT_PAYOUT_REJECTED -> {
                JsonNode payoutEntity = payload.path("payout").path("entity");
                if (!payoutEntity.isMissingNode() && paymentService != null) {
                    JsonNode statusDetails = payoutEntity.path("status_details");
                    paymentService.handlePayoutWebhookUpdate(
                            payoutEntity.path("id").asText(null),
                            payoutEntity.path("status").asText(null),
                            payoutEntity.path("utr").asText(null),
                            statusDetails.path("reason").asText(null),
                            statusDetails.path("description").asText(null)
                    );
                }
            }
            case PaymentConstants.RZP_EVENT_VALIDATION_COMPLETED,
                 PaymentConstants.RZP_EVENT_VALIDATION_FAILED -> {
                JsonNode valEntity = payload.path("fund_account_validation").path("entity");
                if (valEntity.isMissingNode()) {
                    valEntity = payload.path("fund_account.validation").path("entity");
                }
                if (!valEntity.isMissingNode() && beneficiaryService != null) {
                    JsonNode results = valEntity.has("results")
                            ? valEntity.path("results") : valEntity.path("validation_results");
                    JsonNode statusDetails = valEntity.path("status_details");
                    String faId = valEntity.path("fund_account_id").asText(null);
                    if ((faId == null || faId.isBlank()) && valEntity.has("fund_account")) {
                        faId = valEntity.path("fund_account").path("id").asText(null);
                    }
                    beneficiaryService.processValidationWebhook(new ValidationResult(
                            valEntity.path("id").asText(null),
                            faId,
                            valEntity.path("status").asText(""),
                            results.path("account_status").asText(null),
                            results.path("registered_name").asText(null),
                            valEntity.path("utr").asText(null),
                            statusDetails.path("source").asText(null),
                            statusDetails.path("reason").asText(null),
                            statusDetails.path("description").asText(null)
                    ));
                }
            }
            default -> log.info("Received unhandled Razorpay webhook eventType={}", eventType);
        }
    }

    private String extractPrimaryEntityId(JsonNode root, String eventType) {
        JsonNode payload = root.path("payload");
        if (eventType.startsWith("payout.")) {
            return payload.path("payout").path("entity").path("id").asText("unknown-payout");
        }
        if (eventType.startsWith("fund_account.validation")) {
            JsonNode n = payload.path("fund_account_validation").path("entity");
            if (n.isMissingNode()) n = payload.path("fund_account.validation").path("entity");
            return n.path("id").asText("unknown-validation");
        }
        if (eventType.startsWith("refund.")) {
            return payload.path("refund").path("entity").path("id").asText("unknown-refund");
        }
        String payId = payload.path("payment").path("entity").path("id").asText(null);
        if (payId != null && !payId.isBlank()) {
            return payId;
        }
        return payload.path("virtual_account").path("entity").path("id").asText("unknown-entity");
    }

    private String deriveDeterministicEventId(String eventType, String entityId, byte[] rawPayload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update((eventType + ":" + entityId + ":").getBytes(StandardCharsets.UTF_8));
            String hash = HexFormat.of().formatHex(digest.digest(rawPayload));
            return "EVT-" + hash.substring(0, 32);
        } catch (Exception ex) {
            return "EVT-" + eventType + "-" + entityId;
        }
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
                throw new ApiException(HttpStatus.GONE, "WEBHOOK_TIMESTAMP_EXPIRED",
                        "Webhook timestamp is too old or in the future");
            }
        } catch (NumberFormatException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE",
                    "Invalid X-Timestamp header value");
        }
    }

    private void validateLegacySignature(String signature, String timestamp, byte[] payload) {
        if (legacyWebhookSecret == null || legacyWebhookSecret.length() < 32) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "WEBHOOK_NOT_CONFIGURED",
                    "Payment webhook verification is not configured");
        }
        String suppliedHex = signature == null ? null : signature.trim();
        if (suppliedHex != null && suppliedHex.regionMatches(true, 0, "sha256=", 0, 7)) {
            suppliedHex = suppliedHex.substring(7);
        }
        if (suppliedHex == null || !suppliedHex.matches("(?i)[0-9a-f]{64}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE",
                    "Missing or malformed X-Signature header");
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(legacyWebhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            mac.update(timestamp.getBytes(StandardCharsets.UTF_8));
            mac.update((byte) '.');
            byte[] expected = mac.doFinal(payload);
            byte[] supplied = HexFormat.of().parseHex(suppliedHex);
            if (!MessageDigest.isEqual(expected, supplied)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_SIGNATURE",
                        "Webhook signature is invalid");
            }
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("Could not verify payment webhook signature", exception);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "WEBHOOK_VERIFICATION_FAILED",
                    "Webhook signature could not be verified");
        }
    }
}
