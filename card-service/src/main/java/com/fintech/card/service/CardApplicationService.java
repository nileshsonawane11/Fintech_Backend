package com.fintech.card.service;

import com.fintech.card.dto.request.ApproveCardApplicationRequest;
import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.dto.request.RejectCardApplicationRequest;
import com.fintech.card.dto.response.CardApplicationResponse;
import com.fintech.card.dto.response.OpsCardApplicationResponse;
import com.fintech.card.entity.Card;
import com.fintech.card.entity.CardApplication;
import com.fintech.card.entity.CardApplicationIdempotencyKey;
import com.fintech.card.entity.CardControl;
import com.fintech.card.exception.ApiException;
import com.fintech.card.repository.CardApplicationIdempotencyKeyRepository;
import com.fintech.card.repository.CardApplicationRepository;
import com.fintech.card.repository.CardRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CardApplicationService {

    private final CardApplicationRepository cardApplicationRepository;
    private final CardApplicationIdempotencyKeyRepository idempotencyKeyRepository;
    private final CardRepository cardRepository;
    private final Random random = new Random();

    public CardApplicationService(CardApplicationRepository cardApplicationRepository,
                                  CardApplicationIdempotencyKeyRepository idempotencyKeyRepository,
                                  CardRepository cardRepository) {
        this.cardApplicationRepository = cardApplicationRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.cardRepository = cardRepository;
    }

    @Transactional
    public CardApplicationResponse applyForCard(String customerId, String idempotencyKey,
                                                CardApplicationRequest request) {
        String effectiveIdempotencyKey = (idempotencyKey != null && !idempotencyKey.isBlank())
                ? idempotencyKey
                : UUID.randomUUID().toString();

        // Idempotency replay check
        CardApplicationIdempotencyKey existingKey = idempotencyKeyRepository
                .findByIdempotencyKey(effectiveIdempotencyKey).orElse(null);
        if (existingKey != null) {
            CardApplication existing = cardApplicationRepository
                    .findByCardApplicationId(existingKey.getCardApplicationId())
                    .orElseThrow(() -> new ApiException("CARD_APPLICATION_NOT_FOUND",
                            "Application recorded for this idempotency key was not found", HttpStatus.INTERNAL_SERVER_ERROR));
            if (!existing.getCustomerId().equals(customerId)) {
                throw new ApiException("IDEMPOTENCY_KEY_REUSED",
                        "Idempotency-Key was already used by another customer", HttpStatus.CONFLICT);
            }
            return toResponse(existing, request);
        }

        String cardApplicationId = "CARD-APP-" + (400000 + random.nextInt(600000));

        CardApplication application = new CardApplication();
        application.setCardApplicationId(cardApplicationId);
        application.setCustomerId(customerId);
        application.setCardType(request.getEffectiveCardType());
        application.setLinkedAccountId(request.getEffectiveLinkedAccountId());
        application.setDeliveryAddressId(request.getEffectiveDeliveryAddressId());
        application.setStatus("PENDING_APPROVAL");
        application.setEstimatedDeliveryDate(LocalDate.now().plusDays(7));

        cardApplicationRepository.save(application);

        // Store idempotency key
        CardApplicationIdempotencyKey idem = new CardApplicationIdempotencyKey();
        idem.setIdempotencyKey(effectiveIdempotencyKey);
        idem.setCardApplicationId(cardApplicationId);
        idempotencyKeyRepository.save(idem);

        return toResponse(application, request);
    }

    public List<CardApplicationResponse> getCustomerApplications(String customerId) {
        List<CardApplication> list = cardApplicationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        return list.stream()
                .map(app -> toResponse(app, null))
                .collect(Collectors.toList());
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

        if ("APPROVED".equals(app.getStatus())) {
            throw new ApiException("CARD_ALREADY_ISSUED",
                    "Card application " + app.getCardApplicationId() + " has already been approved and card issued.",
                    HttpStatus.CONFLICT);
        }

        app.setStatus("APPROVED");
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
        card.setExpiryMonth(12);
        card.setExpiryYear(2030);

        CardControl ctrl = new CardControl();
        ctrl.setCard(card);
        ctrl.setOnlineEnabled(true);
        ctrl.setInternationalEnabled(false);
        ctrl.setContactlessEnabled(true);
        ctrl.setAtmWithdrawalEnabled(true);
        ctrl.setDailyLimit(request.getEffectiveLimit());
        card.setCardControl(ctrl);

        cardRepository.save(card);

        OpsCardApplicationResponse res = toOpsResponse(app);
        res.setApprovedLimit(request.getEffectiveLimit());
        return res;
    }

    @Transactional
    public OpsCardApplicationResponse rejectApplication(String cardApplicationId, RejectCardApplicationRequest request) {
        CardApplication app = findApplicationOrThrow(cardApplicationId);

        if ("APPROVED".equals(app.getStatus())) {
            throw new ApiException("CARD_ALREADY_ISSUED",
                    "Cannot reject an already approved card application.",
                    HttpStatus.CONFLICT);
        }

        app.setStatus("REJECTED");
        cardApplicationRepository.save(app);

        OpsCardApplicationResponse res = toOpsResponse(app);
        res.setRejectionReason(request.getRemarks());
        return res;
    }

    private CardApplication findApplicationOrThrow(String idOrAppId) {
        return cardApplicationRepository.findByCardApplicationId(idOrAppId)
                .or(() -> cardApplicationRepository.findById(idOrAppId))
                .orElseThrow(() -> new ApiException("APPLICATION_NOT_FOUND",
                        "Card application not found: " + idOrAppId, HttpStatus.NOT_FOUND));
    }

    private CardApplicationResponse toResponse(CardApplication app, CardApplicationRequest request) {
        CardApplicationResponse res = new CardApplicationResponse();
        res.setId(app.getCardApplicationId());
        res.setCardApplicationId(app.getCardApplicationId());
        res.setApplicationId(app.getCardApplicationId());
        res.setReference(app.getCardApplicationId());
        res.setCardType(app.getCardType());

        boolean isCredit = app.getCardType() != null && app.getCardType().toUpperCase().contains("CREDIT");
        res.setKind(isCredit ? "Credit" : "Debit");

        String name = (request != null) ? request.getEffectiveCardName() : (isCredit ? "FinEdge Edge Cashback Card" : "FinEdge Classic Debit Card");
        res.setCardName(name);
        res.setProductName(name);

        String slug = (request != null) ? request.getEffectiveProductSlug() : (isCredit ? "edge-cashback-credit" : "classic-debit");
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
        res.setCustomerName("Applicant (" + app.getCustomerId() + ")");
        res.setCardType(app.getCardType());

        boolean isCredit = app.getCardType() != null && app.getCardType().toUpperCase().contains("CREDIT");
        String name = isCredit ? "FinEdge Edge Cashback Card" : "FinEdge Classic Debit Card";
        res.setCardName(name);
        res.setProductName(name);
        res.setProductSlug(isCredit ? "edge-cashback-credit" : "classic-debit");
        res.setLinkedAccountId(app.getLinkedAccountId());
        res.setDeliveryAddressId(app.getDeliveryAddressId());
        res.setRequestedLimit(isCredit ? new BigDecimal("50000.00") : BigDecimal.ZERO);
        res.setStatus(app.getStatus());
        if (app.getCreatedAt() != null) {
            res.setSubmittedAt(app.getCreatedAt().atOffset(ZoneOffset.UTC));
        } else {
            res.setSubmittedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
        return res;
    }
}
