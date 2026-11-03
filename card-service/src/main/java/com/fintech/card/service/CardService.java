package com.fintech.card.service;

import com.fintech.card.dto.request.BlockCardRequest;
import com.fintech.card.dto.response.BlockCardResponse;
import com.fintech.card.dto.response.CardControlsDto;
import com.fintech.card.dto.response.CardListResponse;
import com.fintech.card.dto.response.CardResponse;
import com.fintech.card.entity.Card;
import com.fintech.card.entity.CardControl;
import com.fintech.card.exception.ApiException;
import com.fintech.card.repository.CardRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CardService {

    private final CardRepository cardRepository;

    public CardService(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    public CardListResponse getCustomerCards(String customerId) {
        List<Card> cards = cardRepository.findByCustomerId(customerId);
        List<CardResponse> cardResponses = cards.stream()
                .map(this::toCardResponse)
                .collect(Collectors.toList());
        return new CardListResponse(cardResponses);
    }

    @Transactional
    public BlockCardResponse blockCard(String customerId, String cardId, BlockCardRequest request) {
        Card card = cardRepository.findByCardId(cardId)
                .orElseThrow(() -> new ApiException("CARD_NOT_FOUND",
                        "Card not found: " + cardId, HttpStatus.NOT_FOUND));

        if (!card.getCustomerId().equals(customerId)) {
            throw new ApiException("CARD_NOT_FOUND",
                    "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }

        if ("BLOCKED".equals(card.getStatus())) {
            throw new ApiException("CARD_ALREADY_BLOCKED",
                    "Card is already blocked", HttpStatus.CONFLICT);
        }

        LocalDateTime blockedAt = LocalDateTime.now(ZoneOffset.UTC);
        card.setStatus("BLOCKED");
        card.setBlockedAt(blockedAt);
        card.setBlockReason(request.getReason());
        card.setBlockRemarks(request.getRemarks());
        cardRepository.save(card);

        BlockCardResponse response = new BlockCardResponse();
        response.setCardId(card.getCardId());
        response.setStatus("BLOCKED");
        response.setBlockedAt(blockedAt.atOffset(ZoneOffset.UTC));
        response.setReason(request.getReason());
        return response;
    }

    public Card findActiveCard(String customerId, String cardId) {
        Card card = cardRepository.findByCardId(cardId)
                .orElseThrow(() -> new ApiException("CARD_NOT_FOUND",
                        "Card not found: " + cardId, HttpStatus.NOT_FOUND));

        if (!card.getCustomerId().equals(customerId)) {
            throw new ApiException("CARD_NOT_FOUND",
                    "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }

        if (!"ACTIVE".equals(card.getStatus())) {
            throw new ApiException("CARD_NOT_ELIGIBLE",
                    "Card is not active and not eligible for this operation", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return card;
    }

    public void verifyCardOwnership(String customerId, String cardId) {
        Card card = cardRepository.findByCardId(cardId)
                .orElseThrow(() -> new ApiException("CARD_NOT_FOUND",
                        "Card not found: " + cardId, HttpStatus.NOT_FOUND));
        if (!card.getCustomerId().equals(customerId)) {
            throw new ApiException("CARD_NOT_FOUND",
                    "Card not found: " + cardId, HttpStatus.NOT_FOUND);
        }
    }

    private CardResponse toCardResponse(Card card) {
        CardResponse dto = new CardResponse();
        dto.setCardId(card.getCardId());
        dto.setCardType(card.getCardType());
        dto.setMaskedCardNumber(card.getMaskedCardNumber());
        dto.setStatus(card.getStatus());
        dto.setLinkedAccountId(card.getLinkedAccountId());
        dto.setExpiryMonth(card.getExpiryMonth());
        dto.setExpiryYear(card.getExpiryYear());

        CardControl ctrl = card.getCardControl();
        if (ctrl != null) {
            CardControlsDto controlsDto = new CardControlsDto();
            controlsDto.setOnlineEnabled(ctrl.getOnlineEnabled());
            controlsDto.setInternationalEnabled(ctrl.getInternationalEnabled());
            controlsDto.setContactlessEnabled(ctrl.getContactlessEnabled());
            controlsDto.setAtmWithdrawalEnabled(ctrl.getAtmWithdrawalEnabled());
            controlsDto.setDailyLimit(ctrl.getDailyLimit());
            dto.setControls(controlsDto);
        }
        return dto;
    }
}
