package com.fintech.card.service;

import com.fintech.card.dto.request.BlockCardRequest;
import com.fintech.card.dto.request.PayCardRequest;
import com.fintech.card.dto.request.UpdateCardControlsRequest;
import com.fintech.card.dto.response.*;
import com.fintech.card.entity.Card;
import com.fintech.card.entity.CardControl;
import com.fintech.card.event.model.NotificationEvent;
import com.fintech.card.event.producer.CardOutboxEventService;
import com.fintech.card.exception.ApiException;
import com.fintech.card.repository.CardRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class CardService {

    private static final Logger log = LoggerFactory.getLogger(CardService.class);

    private final CardRepository cardRepository;
    private final Random random = new Random();

    @Autowired(required = false)
    private CardOutboxEventService outboxEventService;

    public CardService(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    public CardListResponse getCustomerCards(String identitySubject) {
        List<Card> cards = cardRepository.findByIdentitySubjectOrCustomerId(identitySubject, identitySubject);
        List<CardResponse> cardResponses = cards.stream()
                .map(this::toCardResponse)
                .collect(Collectors.toList());
        return new CardListResponse(cardResponses);
    }

    public CardResponse getCardById(String identitySubject, String cardId) {
        Card card = findCardOrThrow(cardId);
        if (!isCardOwnedBy(card, identitySubject)) {
            throw new ApiException("CARD_NOT_FOUND", "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }
        return toCardResponse(card);
    }

    @Transactional
    public BlockCardResponse blockCard(String identitySubject, String cardId, BlockCardRequest request) {
        Card card = findCardOrThrow(cardId);

        if (!isCardOwnedBy(card, identitySubject)) {
            throw new ApiException("CARD_NOT_FOUND", "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }

        if ("BLOCKED".equals(card.getStatus())) {
            throw new ApiException("CARD_ALREADY_BLOCKED", "Card is already blocked", HttpStatus.CONFLICT);
        }

        LocalDateTime blockedAt = LocalDateTime.now(ZoneOffset.UTC);
        card.setStatus("BLOCKED");
        card.setBlockedAt(blockedAt);
        card.setBlockReason(request.getReason());
        card.setBlockRemarks(request.getRemarks());
        cardRepository.save(card);

        enqueueCardNotification(
                resolveRecipient(card, identitySubject),
                "CARD_BLOCKED",
                card.getCardId(),
                "Card Blocked",
                "Your card (" + card.getMaskedCardNumber() + ") has been blocked.",
                "CRITICAL",
                java.util.Map.of("cardId", card.getCardId(), "maskedCardNumber", card.getMaskedCardNumber(),
                        "reason", request.getReason() != null ? request.getReason() : "")
        );

        BlockCardResponse response = new BlockCardResponse();
        response.setId(card.getCardId());
        response.setCardId(card.getCardId());
        response.setStatus("BLOCKED");
        response.setBlockedAt(blockedAt.atOffset(ZoneOffset.UTC));
        response.setReason(request.getReason());
        return response;
    }

    @Transactional
    public CardControlResponse updateControls(String identitySubject, String cardId, UpdateCardControlsRequest request) {
        Card card = findCardOrThrow(cardId);

        if (!isCardOwnedBy(card, identitySubject)) {
            throw new ApiException("CARD_NOT_FOUND", "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }

        if ("BLOCKED".equals(card.getStatus())) {
            throw new ApiException("CARD_BLOCKED", "Cannot update controls on a blocked card", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        CardControl ctrl = card.getCardControl();
        if (ctrl == null) {
            ctrl = new CardControl();
            ctrl.setCard(card);
            card.setCardControl(ctrl);
        }

        Boolean online = request.resolveOnline();
        if (online != null) {
            ctrl.setOnlineEnabled(online);
        }

        Boolean atm = request.resolveAtm();
        if (atm != null) {
            ctrl.setAtmWithdrawalEnabled(atm);
        }

        Boolean international = request.resolveInternational();
        if (international != null) {
            ctrl.setInternationalEnabled(international);
        }

        Boolean contactless = request.resolveContactless();
        if (contactless != null) {
            ctrl.setContactlessEnabled(contactless);
        }

        BigDecimal dailyLimit = request.resolveDailyLimit();
        if (dailyLimit != null) {
            ctrl.setDailyLimit(dailyLimit);
        }

        cardRepository.save(card);

        enqueueCardNotification(
                resolveRecipient(card, identitySubject),
                "CARD_CONTROLS_UPDATED",
                card.getCardId(),
                "Card Controls Updated",
                "Security controls and spending limits for your card (" + card.getMaskedCardNumber() + ") have been updated.",
                "NORMAL",
                java.util.Map.of("cardId", card.getCardId(), "maskedCardNumber", card.getMaskedCardNumber())
        );

        CardControlsDto controlsDto = new CardControlsDto();
        controlsDto.setOnline(ctrl.getOnlineEnabled());
        controlsDto.setOnlineEnabled(ctrl.getOnlineEnabled());
        controlsDto.setAtm(ctrl.getAtmWithdrawalEnabled());
        controlsDto.setAtmWithdrawalEnabled(ctrl.getAtmWithdrawalEnabled());
        controlsDto.setInternational(ctrl.getInternationalEnabled());
        controlsDto.setInternationalEnabled(ctrl.getInternationalEnabled());
        controlsDto.setContactless(ctrl.getContactlessEnabled());
        controlsDto.setContactlessEnabled(ctrl.getContactlessEnabled());
        controlsDto.setDailyLimit(ctrl.getDailyLimit());

        BigDecimal atmDaily = request.resolveAtmDailyLimit();
        if (atmDaily == null) {
            atmDaily = new BigDecimal("25000.00");
        }
        CardLimitsDto limitsDto = new CardLimitsDto(ctrl.getDailyLimit(), atmDaily);

        return new CardControlResponse(card.getCardId(), controlsDto, limitsDto);
    }

    @Transactional
    public PayCardResponse payCard(String customerId, String cardId, PayCardRequest request) {
        Card card = findCardOrThrow(cardId);

        if (!card.getCustomerId().equals(customerId)) {
            throw new ApiException("CARD_NOT_FOUND", "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException("INVALID_AMOUNT", "Payment amount must be greater than zero", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        String paymentRef = "PAY-CARD-" + (100000 + random.nextInt(900000));
        BigDecimal remainingOutstanding = BigDecimal.ZERO;

        enqueueCardNotification(
                card.getIdentitySubject(),
                "CARD_BILL_PAID",
                card.getCardId(),
                "Card Payment Received",
                "Payment of " + request.getAmount() + " for card (" + card.getMaskedCardNumber() + ") succeeded (Ref: " + paymentRef + ").",
                "NORMAL",
                java.util.Map.of("cardId", card.getCardId(), "paymentRef", paymentRef, "amount", request.getAmount().toPlainString())
        );

        return new PayCardResponse(true, paymentRef, request.getAmount(), remainingOutstanding);
    }

    private String resolveRecipient(Card card, String fallbackSubject) {
        if (card.getIdentitySubject() != null && !card.getIdentitySubject().isBlank()) {
            return card.getIdentitySubject();
        }
        return fallbackSubject;
    }

    private void enqueueCardNotification(String recipientId, String eventType, String cardId,
                                         String title, String message, String priority,
                                         java.util.Map<String, Object> metadata) {
        if (outboxEventService == null) {
            return;
        }
        if (recipientId == null || recipientId.isBlank()) {
            log.warn("Skipping card notification {} for cardId={}: missing identitySubject", eventType, cardId);
            return;
        }
        outboxEventService.enqueueEvent(
                recipientId,
                "NOTIFICATION",
                "NOTIFICATION_REQUESTED",
                NotificationEvent.of(
                        eventType,
                        recipientId,
                        cardId,
                        "CARD",
                        title,
                        message,
                        "CARD",
                        priority,
                        metadata
                )
        );
    }

    public Card findActiveCard(String identitySubject, String cardId) {
        Card card = findCardOrThrow(cardId);

        if (!isCardOwnedBy(card, identitySubject)) {
            throw new ApiException("CARD_NOT_FOUND", "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }

        if (!"ACTIVE".equals(card.getStatus())) {
            throw new ApiException("CARD_NOT_ELIGIBLE",
                    "Card is not active and not eligible for this operation", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return card;
    }

    public void verifyCardOwnership(String identitySubject, String cardId) {
        Card card = findCardOrThrow(cardId);
        if (!isCardOwnedBy(card, identitySubject)) {
            throw new ApiException("CARD_NOT_FOUND", "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }
    }

    private boolean isCardOwnedBy(Card card, String identitySubject) {
        if (card.getIdentitySubject() != null) {
            return card.getIdentitySubject().equalsIgnoreCase(identitySubject);
        }
        return card.getCustomerId() != null && card.getCustomerId().equalsIgnoreCase(identitySubject);
    }

    private Card findCardOrThrow(String cardId) {
        return cardRepository.findByCardId(cardId)
                .or(() -> cardRepository.findById(cardId))
                .orElseThrow(() -> new ApiException("CARD_NOT_FOUND", "Card not found: " + cardId, HttpStatus.NOT_FOUND));
    }

    public CardResponse toCardResponse(Card card) {
        CardResponse dto = new CardResponse();
        dto.setId(card.getCardId());
        dto.setCardId(card.getCardId());
        dto.setCustomerId(card.getCustomerId());
        dto.setIdentitySubject(card.getIdentitySubject());
        dto.setCardType(card.getCardType());
        dto.setKind(card.getCardType());
        dto.setMaskedCardNumber(card.getMaskedCardNumber());
        dto.setCardNumber(card.getMaskedCardNumber());
        dto.setNumber(card.getMaskedCardNumber());
        dto.setStatus(card.getStatus());
        dto.setLinkedAccountId(card.getLinkedAccountId());
        dto.setExpiryMonth(card.getExpiryMonth());
        dto.setExpiryYear(card.getExpiryYear());

        if (card.getExpiryMonth() != null && card.getExpiryYear() != null) {
            String yearStr = String.valueOf(card.getExpiryYear());
            String yy = yearStr.length() >= 2 ? yearStr.substring(yearStr.length() - 2) : "30";
            dto.setExpiryDate(String.format("%02d/%s", card.getExpiryMonth(), yy));
        } else {
            dto.setExpiryDate("12/30");
        }

        boolean isCredit = card.getCardType() != null && card.getCardType().toUpperCase().contains("CREDIT");
        if (isCredit) {
            dto.setCardName("FinEdge Edge Cashback Card");
            dto.setProductName("FinEdge Edge Cashback Card");
            dto.setProductSlug("edge-cashback-credit");
            dto.setTotalLimit(new BigDecimal("250000.00"));
            dto.setCreditLimit(new BigDecimal("250000.00"));
            dto.setLimit(new BigDecimal("250000.00"));
            dto.setAvailableLimit(new BigDecimal("231550.00"));
            dto.setOutstanding(new BigDecimal("18450.00"));
            dto.setMinDue(new BigDecimal("1845.00"));
            dto.setDueDate("2026-11-20");
        } else {
            dto.setCardName("FinEdge Classic Debit Card");
            dto.setProductName("FinEdge Classic Debit Card");
            dto.setProductSlug("classic-debit");
        }

        dto.setNetwork("RuPay");
        dto.setDispatchRef("DSP-" + Math.abs(card.getCardId().hashCode() % 900000 + 100000));

        CardControl ctrl = card.getCardControl();
        CardControlsDto controlsDto = new CardControlsDto();
        if (ctrl != null) {
            controlsDto.setOnline(ctrl.getOnlineEnabled());
            controlsDto.setOnlineEnabled(ctrl.getOnlineEnabled());
            controlsDto.setInternational(ctrl.getInternationalEnabled());
            controlsDto.setInternationalEnabled(ctrl.getInternationalEnabled());
            controlsDto.setContactless(ctrl.getContactlessEnabled());
            controlsDto.setContactlessEnabled(ctrl.getContactlessEnabled());
            controlsDto.setAtm(ctrl.getAtmWithdrawalEnabled());
            controlsDto.setAtmWithdrawalEnabled(ctrl.getAtmWithdrawalEnabled());
            controlsDto.setDailyLimit(ctrl.getDailyLimit());
        }
        dto.setControls(controlsDto);

        BigDecimal spendDaily = (ctrl != null && ctrl.getDailyLimit() != null)
                ? ctrl.getDailyLimit()
                : (isCredit ? new BigDecimal("150000.00") : new BigDecimal("50000.00"));
        BigDecimal atmDaily = isCredit ? new BigDecimal("25000.00") : new BigDecimal("20000.00");
        dto.setLimits(new CardLimitsDto(spendDaily, atmDaily));

        return dto;
    }
}
