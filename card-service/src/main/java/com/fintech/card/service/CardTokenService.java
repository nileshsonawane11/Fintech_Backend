package com.fintech.card.service;

import com.fintech.card.dto.request.CreateCardTokenRequest;
import com.fintech.card.dto.response.CardTokenResponse;
import com.fintech.card.entity.Card;
import com.fintech.card.entity.CardToken;
import com.fintech.card.exception.ApiException;
import com.fintech.card.repository.CardTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.time.ZoneOffset;

@Service
public class CardTokenService {

    private final CardTokenRepository cardTokenRepository;
    private final CardService cardService;

    public CardTokenService(CardTokenRepository cardTokenRepository, CardService cardService) {
        this.cardTokenRepository = cardTokenRepository;
        this.cardService = cardService;
    }

    @Transactional
    public CardTokenResponse createToken(String customerId, String cardId,
                                         String idempotencyKey, CreateCardTokenRequest request) {
        CardToken existing = cardTokenRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existing != null) {
            cardService.verifyCardOwnership(customerId, existing.getCardId());
            if (!existing.getCardId().equals(cardId)) {
                throw new ApiException("IDEMPOTENCY_KEY_REUSED",
                        "Idempotency-Key was already used for a different request", HttpStatus.CONFLICT);
            }
            return toResponse(existing);
        }

        // Consent check
        if (request.getConsentId() == null || request.getConsentId().isBlank()) {
            throw new ApiException("TOKENIZATION_CONSENT_REQUIRED",
                    "A valid consentId is required for card tokenization", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        // Card eligibility check (must be ACTIVE)
        Card card = cardService.findActiveCard(customerId, cardId);

        String tokenId = "TOKEN-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        String tokenReference = "tok_" + UUID.randomUUID().toString().replace("-", "");

        CardToken token = new CardToken();
        token.setCardTokenId(tokenId);
        token.setCardId(card.getCardId());
        token.setIdempotencyKey(idempotencyKey);
        token.setTokenRequestor(request.getTokenRequestor());
        token.setConsentId(request.getConsentId());
        token.setTokenReference(tokenReference);
        token.setStatus("ACTIVE");

        cardTokenRepository.save(token);

        return toResponse(token);
    }

    private CardTokenResponse toResponse(CardToken token) {
        CardTokenResponse response = new CardTokenResponse();
        response.setCardTokenId(token.getCardTokenId());
        response.setCardId(token.getCardId());
        response.setTokenReference(token.getTokenReference());
        response.setStatus(token.getStatus());
        response.setCreatedAt(token.getCreatedAt().atOffset(ZoneOffset.UTC));
        return response;
    }
}
