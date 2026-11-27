package com.fintech.card.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.card.client.AccountServiceClient;
import com.fintech.card.client.CustomerServiceClient;
import com.fintech.card.client.dto.AccountVerificationDto;
import com.fintech.card.client.dto.AddressVerificationDto;
import com.fintech.card.client.dto.CustomerProfileDto;
import com.fintech.card.domain.CanonicalCardApplication;
import com.fintech.card.domain.CardApplicationNormalizer;
import com.fintech.card.domain.CardEligibilityValidator;
import com.fintech.card.dto.request.ApproveCardApplicationRequest;
import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.dto.request.RejectCardApplicationRequest;
import com.fintech.card.dto.response.CardApplicationResponse;
import com.fintech.card.dto.response.OpsCardApplicationResponse;
import com.fintech.card.entity.Card;
import com.fintech.card.entity.CardApplication;
import com.fintech.card.entity.CardApplicationIdempotencyKey;
import com.fintech.card.entity.CardControl;
import com.fintech.card.event.model.CardApplicationApprovedEvent;
import com.fintech.card.event.model.CardApplicationRejectedEvent;
import com.fintech.card.event.model.CardApplicationSubmittedEvent;
import com.fintech.card.event.model.CardIssuedEvent;
import com.fintech.card.event.producer.CardOutboxEventService;
import com.fintech.card.exception.ApiException;
import com.fintech.card.exception.CardApplicationValidationException;
import com.fintech.card.repository.CardApplicationIdempotencyKeyRepository;
import com.fintech.card.repository.CardApplicationRepository;
import com.fintech.card.repository.CardRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CardApplicationService {

    private static final Logger log = LoggerFactory.getLogger(CardApplicationService.class);

    private final CardApplicationRepository cardApplicationRepository;
    private final CardApplicationIdempotencyKeyRepository idempotencyKeyRepository;
    private final CardRepository cardRepository;
    private final AccountServiceClient accountServiceClient;
    private final CustomerServiceClient customerServiceClient;
    private final CardApplicationNormalizer normalizer;
    private final CardEligibilityValidator eligibilityValidator;
    private final CardIdempotencyService idempotencyService;
    private final CardOutboxEventService outboxEventService;
    private final ObjectMapper objectMapper;
    private final Random random = new Random();

    public CardApplicationService(
            CardApplicationRepository cardApplicationRepository,
            CardApplicationIdempotencyKeyRepository idempotencyKeyRepository,
            CardRepository cardRepository,
            AccountServiceClient accountServiceClient,
            CustomerServiceClient customerServiceClient,
            CardApplicationNormalizer normalizer,
            CardEligibilityValidator eligibilityValidator,
            CardIdempotencyService idempotencyService,
            CardOutboxEventService outboxEventService,
            ObjectMapper objectMapper) {
        this.cardApplicationRepository = cardApplicationRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.cardRepository = cardRepository;
        this.accountServiceClient = accountServiceClient;
        this.customerServiceClient = customerServiceClient;
        this.normalizer = normalizer;
        this.eligibilityValidator = eligibilityValidator;
        this.idempotencyService = idempotencyService;
        this.outboxEventService = outboxEventService;
        this.objectMapper = objectMapper;
    }

    /**
     * Complete Card Application Workflow:
     * 1. Request normalization and conflict detection
     * 2. Request fingerprinting and idempotency replay check
     * 3. Inter-service REST validation (Account ownership, Address deliverability, KYC)
     * 4. Strict cross-service customer ownership validation (Conditions A, B, C, D)
     * 5. Atomic persistence of CardApplication and Outbox event
     */
    @Transactional
    public CardApplicationResponse applyForCard(String authenticatedSubject, String idempotencyKey,
                                                CardApplicationRequest request) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new CardApplicationValidationException("Idempotency-Key header is required for card application submission.");
        }

        // 1. Normalize request and resolve canonical parameters
        CanonicalCardApplication canonical = normalizer.normalize(request);

        // 2. Compute idempotency fingerprint
        String requestHash = idempotencyService.computeFingerprint(canonical);

        // 3. Idempotency replay check
        Optional<CardApplicationIdempotencyKey> existingKeyOpt =
                idempotencyService.findAndValidate(idempotencyKey, authenticatedSubject, requestHash);

        if (existingKeyOpt.isPresent()) {
            CardApplicationIdempotencyKey existingKey = existingKeyOpt.get();
            log.info("Idempotency replay detected for key={}: returning previous application result", idempotencyKey);
            if (existingKey.getResponsePayload() != null && !existingKey.getResponsePayload().isBlank()) {
                try {
                    return objectMapper.readValue(existingKey.getResponsePayload(), CardApplicationResponse.class);
                } catch (Exception e) {
                    log.warn("Failed to deserialize cached idempotency response: {}", e.getMessage());
                }
            }

            CardApplication existing = cardApplicationRepository
                    .findByCardApplicationId(existingKey.getCardApplicationId())
                    .orElseThrow(() -> new ApiException("CARD_APPLICATION_NOT_FOUND",
                            "Application recorded for this idempotency key was not found", HttpStatus.INTERNAL_SERVER_ERROR));
            return toResponse(existing, canonical);
        }

        // 4. Synchronous Inter-Service REST Validation (outside database transaction)
        AccountVerificationDto account = accountServiceClient.getAccountVerification(canonical.linkedAccountId());
        AddressVerificationDto address = customerServiceClient.getAddressVerification(canonical.deliveryAddressId());

        boolean owns = (account.identitySubject().equalsIgnoreCase(authenticatedSubject) && address.identitySubject().equalsIgnoreCase(authenticatedSubject));
        if (!owns) {
            log.warn("Unauthorized access attempt  by identitySubject {}",  authenticatedSubject);
            throw new AccessDeniedException("Access Denied: You do not own this card application.");
        }

        CustomerProfileDto customerProfile = null;
        try {
            customerProfile = customerServiceClient.getCustomerProfile(authenticatedSubject);
        } catch (Exception e) {
            log.debug("Customer profile lookup not available or optional: {}", e.getMessage());
        }

        String canonicalCustomerId = (customerProfile != null && customerProfile.customerId() != null)
                ? customerProfile.customerId()
                : (account.customerId() != null ? account.customerId() : authenticatedSubject);

        // 5. Cross-service customer ownership and eligibility checks
        eligibilityValidator.validateEligibility(
                canonicalCustomerId,
                authenticatedSubject,
                canonical,
                account,
                address,
                customerProfile
        );

        // 6. Atomic Persistence in Local DB Transaction
        return persistApplicationAndOutbox(authenticatedSubject, canonicalCustomerId, idempotencyKey, requestHash, canonical);
    }

    public CardApplicationResponse persistApplicationAndOutbox(
            String customerId,
            String idempotencyKey,
            String requestHash,
            CanonicalCardApplication canonical) {
        return persistApplicationAndOutbox(customerId, customerId, idempotencyKey, requestHash, canonical);
    }

    public CardApplicationResponse persistApplicationAndOutbox(
            String identitySubject,
            String customerId,
            String idempotencyKey,
            String requestHash,
            CanonicalCardApplication canonical) {

        String cardApplicationId = "CARD-APP-" + (400000 + random.nextInt(600000));

        CardApplication application = new CardApplication();
        application.setCardApplicationId(cardApplicationId);
        application.setIdentitySubject(identitySubject);
        application.setCustomerId(customerId);
        application.setCardType(canonical.cardType());
        application.setCardName(canonical.cardName());
        application.setProductSlug(canonical.productSlug());
        application.setLinkedAccountId(canonical.linkedAccountId());
        application.setDeliveryAddressId(canonical.deliveryAddressId());
        application.setRequestedLimit(canonical.requestedLimit());
        application.setStatus("PENDING_APPROVAL");
        application.setEstimatedDeliveryDate(LocalDate.now().plusDays(7));

        cardApplicationRepository.save(application);

        // 7. Enqueue Domain Event in Outbox (Transactional Outbox Pattern)
        CardApplicationSubmittedEvent submittedEvent = new CardApplicationSubmittedEvent(
                cardApplicationId,
                customerId,
                canonical.linkedAccountId(),
                canonical.deliveryAddressId(),
                canonical.cardType(),
                canonical.cardName(),
                canonical.productSlug(),
                canonical.requestedLimit(),
                "PENDING_APPROVAL",
                Instant.now()
        );

        outboxEventService.enqueueEvent(
                cardApplicationId,
                "CARD_APPLICATION",
                "CARD_APPLICATION_SUBMITTED",
                submittedEvent
        );

        enqueueCardNotification(
                application.getIdentitySubject(),
                "CARD_APPLICATION_SUBMITTED",
                cardApplicationId,
                "CARD_APPLICATION",
                "Card Application Submitted",
                "Your " + canonical.cardType() + " card application (" + cardApplicationId + ") has been submitted.",
                "NORMAL",
                java.util.Map.of("cardApplicationId", cardApplicationId, "cardType", canonical.cardType())
        );

        CardApplicationResponse response = toResponse(application, canonical);

        // 8. Store idempotency record with request hash and response payload
        String responseJson = null;
        try {
            responseJson = objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize card application response for idempotency cache: {}", e.getMessage());
        }

        idempotencyService.recordIdempotency(
                idempotencyKey,
                cardApplicationId,
                customerId,
                requestHash,
                responseJson
        );

        log.info("Card application {} submitted and enqueued in outbox for customer {}",
                cardApplicationId, customerId);

        return response;
    }

    public List<CardApplicationResponse> getCustomerApplications(String identitySubject) {
        List<CardApplication> list = cardApplicationRepository
                .findByIdentitySubjectOrCustomerIdOrderByCreatedAtDesc(identitySubject, identitySubject);
        return list.stream()
                .map(app -> toResponse(app, null))
                .collect(Collectors.toList());
    }

    public CardApplicationResponse getApplicationById(String identitySubject, String applicationId, boolean isStaff) {
        CardApplication app = findApplicationOrThrow(applicationId);

        if (!isStaff) {
            boolean owns = (app.getIdentitySubject() != null && app.getIdentitySubject().equalsIgnoreCase(identitySubject))
                    || (app.getCustomerId() != null && app.getCustomerId().equalsIgnoreCase(identitySubject));
            if (!owns) {
                log.warn("Unauthorized access attempt to application {} by identitySubject {}", applicationId, identitySubject);
                throw new AccessDeniedException("Access Denied: You do not own this card application.");
            }
        }

        return toResponse(app, null);
    }

    public List<OpsCardApplicationResponse> getAllApplications() {
        List<CardApplication> list = cardApplicationRepository.findAllByOrderByCreatedAtDesc();
        return list.stream()
                .map(this::toOpsResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public OpsCardApplicationResponse approveApplication(String cardApplicationId, ApproveCardApplicationRequest request) {
        CardApplication app = findApplicationOrThrow(cardApplicationId);

        if ("APPROVED".equalsIgnoreCase(app.getStatus())) {
            throw new ApiException("CARD_ALREADY_ISSUED",
                    "Card application " + app.getCardApplicationId() + " has already been approved and card issued.",
                    HttpStatus.CONFLICT);
        }
        if ("REJECTED".equalsIgnoreCase(app.getStatus())) {
            throw new ApiException("APPLICATION_ALREADY_DECIDED",
                    "Cannot approve an already rejected card application.",
                    HttpStatus.CONFLICT);
        }

        BigDecimal approvedLimit = (request != null && request.getEffectiveLimit() != null)
                ? request.getEffectiveLimit()
                : (app.getRequestedLimit() != null ? app.getRequestedLimit() : new BigDecimal("50000.00"));

        app.setStatus("APPROVED");
        app.setApprovedLimit(approvedLimit);
        cardApplicationRepository.save(app);

        // Automatically issue new card in cards table
        String newCardId = "CARD-" + (3000 + random.nextInt(6000));
        String last4 = String.format("%04d", 1000 + random.nextInt(9000));
        String rawNumber = "4532" + (10000000 + random.nextInt(90000000)) + last4;

        Card card = new Card();
        card.setCardId(newCardId);
        card.setCustomerId(app.getCustomerId());
        card.setCardType(app.getCardType());
        card.setCardNumber(rawNumber);
        card.setMaskedCardNumber("************" + last4);
        card.setStatus("ACTIVE");
        card.setLinkedAccountId(app.getLinkedAccountId());
        card.setIdentitySubject(app.getIdentitySubject());
        card.setExpiryMonth(12);
        card.setExpiryYear(2030);

        CardControl ctrl = new CardControl();
        ctrl.setCard(card);
        ctrl.setOnlineEnabled(true);
        ctrl.setInternationalEnabled(false);
        ctrl.setContactlessEnabled(true);
        ctrl.setAtmWithdrawalEnabled(true);
        ctrl.setDailyLimit(approvedLimit);
        card.setCardControl(ctrl);

        cardRepository.save(card);

        // Outbox event: CardApplicationApprovedEvent
        CardApplicationApprovedEvent approvedEvent = new CardApplicationApprovedEvent(
                app.getCardApplicationId(),
                app.getCustomerId(),
                newCardId,
                approvedLimit,
                Instant.now(),
                "OPERATIONS_STAFF"
        );
        outboxEventService.enqueueEvent(
                app.getCardApplicationId(),
                "CARD_APPLICATION",
                "CARD_APPLICATION_APPROVED",
                approvedEvent
        );

        // Outbox event: CardIssuedEvent
        CardIssuedEvent issuedEvent = new CardIssuedEvent(
                newCardId,
                app.getCardApplicationId(),
                app.getCustomerId(),
                card.getMaskedCardNumber(),
                card.getCardType(),
                card.getLinkedAccountId(),
                Instant.now()
        );
        outboxEventService.enqueueEvent(
                newCardId,
                "CARD",
                "CARD_ISSUED",
                issuedEvent
        );

        enqueueCardNotification(
                app.getIdentitySubject(),
                "CARD_ISSUED",
                newCardId,
                "CARD",
                "Card Approved & Issued",
                "Your " + card.getCardType() + " card (" + card.getMaskedCardNumber() + ") has been approved and issued.",
                "HIGH",
                java.util.Map.of("cardId", newCardId, "cardApplicationId", app.getCardApplicationId(),
                        "maskedCardNumber", card.getMaskedCardNumber())
        );

        log.info("Card application {} approved. Issued card {} for customer {}",
                app.getCardApplicationId(), newCardId, app.getCustomerId());

        OpsCardApplicationResponse res = toOpsResponse(app);
        res.setApprovedLimit(approvedLimit);
        return res;
    }

    @Transactional
    public OpsCardApplicationResponse rejectApplication(String cardApplicationId, RejectCardApplicationRequest request) {
        CardApplication app = findApplicationOrThrow(cardApplicationId);

        if ("APPROVED".equalsIgnoreCase(app.getStatus())) {
            throw new ApiException("CARD_ALREADY_ISSUED",
                    "Cannot reject an already approved card application.",
                    HttpStatus.CONFLICT);
        }
        if ("REJECTED".equalsIgnoreCase(app.getStatus())) {
            throw new ApiException("APPLICATION_ALREADY_DECIDED",
                    "Card application " + app.getCardApplicationId() + " is already rejected.",
                    HttpStatus.CONFLICT);
        }

        String reason = (request != null && request.getRemarks() != null) ? request.getRemarks() : "Underwriting criteria not met";
        app.setStatus("REJECTED");
        app.setRejectionReason(reason);
        cardApplicationRepository.save(app);

        // Outbox event: CardApplicationRejectedEvent
        CardApplicationRejectedEvent rejectedEvent = new CardApplicationRejectedEvent(
                app.getCardApplicationId(),
                app.getCustomerId(),
                reason,
                Instant.now(),
                "OPERATIONS_STAFF"
        );
        outboxEventService.enqueueEvent(
                app.getCardApplicationId(),
                "CARD_APPLICATION",
                "CARD_APPLICATION_REJECTED",
                rejectedEvent
        );

        enqueueCardNotification(
                app.getIdentitySubject(),
                "CARD_APPLICATION_REJECTED",
                app.getCardApplicationId(),
                "CARD_APPLICATION",
                "Card Application Rejected",
                "Your card application (" + app.getCardApplicationId() + ") was not approved.",
                "HIGH",
                java.util.Map.of("cardApplicationId", app.getCardApplicationId())
        );

        log.info("Card application {} rejected. Reason: {}", app.getCardApplicationId(), reason);

        OpsCardApplicationResponse res = toOpsResponse(app);
        res.setRejectionReason(reason);
        return res;
    }

    private void enqueueCardNotification(String recipientId, String eventType, String aggregateId,
                                         String aggregateType, String title, String message,
                                         String priority, java.util.Map<String, Object> metadata) {
        if (recipientId == null || recipientId.isBlank()) {
            log.warn("Skipping card notification {} for aggregateId={}: missing identitySubject", eventType, aggregateId);
            return;
        }
        outboxEventService.enqueueEvent(
                recipientId,
                "NOTIFICATION",
                "NOTIFICATION_REQUESTED",
                com.fintech.card.event.model.NotificationEvent.of(
                        eventType,
                        recipientId,
                        aggregateId,
                        aggregateType,
                        title,
                        message,
                        "CARD",
                        priority,
                        metadata
                )
        );
    }

    private CardApplication findApplicationOrThrow(String idOrAppId) {
        return cardApplicationRepository.findByCardApplicationId(idOrAppId)
                .or(() -> cardApplicationRepository.findById(idOrAppId))
                .orElseThrow(() -> new ApiException("APPLICATION_NOT_FOUND",
                        "Card application not found: " + idOrAppId, HttpStatus.NOT_FOUND));
    }

    private CardApplicationResponse toResponse(CardApplication app, CanonicalCardApplication canonical) {
        CardApplicationResponse res = new CardApplicationResponse();
        res.setId(app.getCardApplicationId());
        res.setCardApplicationId(app.getCardApplicationId());
        res.setApplicationId(app.getCardApplicationId());
        res.setReference(app.getCardApplicationId());
        res.setCustomerId(app.getCustomerId());
        res.setIdentitySubject(app.getIdentitySubject());
        res.setCardType(app.getCardType());
        res.setLinkedAccountId(app.getLinkedAccountId());
        res.setDeliveryAddressId(app.getDeliveryAddressId());
        res.setRequestedLimit(app.getRequestedLimit());
        res.setApprovedLimit(app.getApprovedLimit());

        boolean isCredit = app.getCardType() != null && app.getCardType().toUpperCase().contains("CREDIT");
        res.setKind(isCredit ? "Credit" : "Debit");

        String name = (canonical != null) ? canonical.cardName()
                : (app.getCardName() != null ? app.getCardName() : (isCredit ? "FinEdge Edge Cashback Card" : "FinEdge Classic Debit Card"));
        res.setCardName(name);
        res.setProductName(name);

        String slug = (canonical != null) ? canonical.productSlug()
                : (app.getProductSlug() != null ? app.getProductSlug() : (isCredit ? "edge-cashback-credit" : "classic-debit"));
        res.setProductSlug(slug);

        res.setStatus(app.getStatus());
        res.setEstimatedDeliveryTime(app.getEstimatedDeliveryDate());
        res.setEstimatedDeliveryDate(app.getEstimatedDeliveryDate());
        if (app.getCreatedAt() != null) {
            res.setSubmittedAt(app.getCreatedAt().atOffset(ZoneOffset.UTC));
        } else {
            res.setSubmittedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
        return res;
    }

    private OpsCardApplicationResponse toOpsResponse(CardApplication app) {
        OpsCardApplicationResponse res = new OpsCardApplicationResponse();
        res.setId(app.getCardApplicationId());
        res.setCardApplicationId(app.getCardApplicationId());
        res.setCustomerId(app.getCustomerId());
        res.setIdentitySubject(app.getIdentitySubject());
        res.setCustomerName("Applicant (" + app.getCustomerId() + ")");
        res.setCardType(app.getCardType());

        boolean isCredit = app.getCardType() != null && app.getCardType().toUpperCase().contains("CREDIT");
        String name = (app.getCardName() != null) ? app.getCardName() : (isCredit ? "FinEdge Edge Cashback Card" : "FinEdge Classic Debit Card");
        res.setCardName(name);
        res.setProductName(name);
        res.setProductSlug((app.getProductSlug() != null) ? app.getProductSlug() : (isCredit ? "edge-cashback-credit" : "classic-debit"));
        res.setLinkedAccountId(app.getLinkedAccountId());
        res.setDeliveryAddressId(app.getDeliveryAddressId());
        res.setRequestedLimit(app.getRequestedLimit() != null ? app.getRequestedLimit() : (isCredit ? new BigDecimal("50000.00") : BigDecimal.ZERO));
        res.setApprovedLimit(app.getApprovedLimit());
        res.setRejectionReason(app.getRejectionReason());
        res.setStatus(app.getStatus());
        if (app.getCreatedAt() != null) {
            res.setSubmittedAt(app.getCreatedAt().atOffset(ZoneOffset.UTC));
        } else {
            res.setSubmittedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
        return res;
    }
}
