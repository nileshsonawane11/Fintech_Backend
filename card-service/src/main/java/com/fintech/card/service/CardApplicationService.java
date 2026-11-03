package com.fintech.card.service;

import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.dto.response.CardApplicationResponse;
import com.fintech.card.entity.CardApplication;
import com.fintech.card.entity.CardApplicationIdempotencyKey;
import com.fintech.card.exception.ApiException;
import com.fintech.card.repository.CardApplicationIdempotencyKeyRepository;
import com.fintech.card.repository.CardApplicationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
public class CardApplicationService {

    private final CardApplicationRepository cardApplicationRepository;
    private final CardApplicationIdempotencyKeyRepository idempotencyKeyRepository;

    public CardApplicationService(CardApplicationRepository cardApplicationRepository,
                                  CardApplicationIdempotencyKeyRepository idempotencyKeyRepository) {
        this.cardApplicationRepository = cardApplicationRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
    }

    @Transactional
    public CardApplicationResponse applyForCard(String customerId, String idempotencyKey,
                                                CardApplicationRequest request) {
        // Return the original result when a client retries the same request.
        CardApplicationIdempotencyKey existingKey = idempotencyKeyRepository
                .findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existingKey != null) {
            CardApplication existing = cardApplicationRepository
                    .findByCardApplicationId(existingKey.getCardApplicationId())
                    .orElseThrow(() -> new ApiException("CARD_APPLICATION_NOT_FOUND",
                            "Application recorded for this idempotency key was not found", HttpStatus.INTERNAL_SERVER_ERROR));
            if (!existing.getCustomerId().equals(customerId)) {
                throw new ApiException("IDEMPOTENCY_KEY_REUSED",
                        "Idempotency-Key was already used by another customer", HttpStatus.CONFLICT);
            }
            CardApplicationResponse replay = new CardApplicationResponse();
            replay.setCardApplicationId(existing.getCardApplicationId());
            replay.setCardType(existing.getCardType());
            replay.setStatus(existing.getStatus());
            replay.setEstimatedDeliveryTime(existing.getEstimatedDeliveryDate());
            return replay;
        }

        String cardApplicationId = "CARD-APP-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        CardApplication application = new CardApplication();
        application.setCardApplicationId(cardApplicationId);
        application.setCustomerId(customerId);
        application.setCardType(request.getCardType().toUpperCase());
        application.setLinkedAccountId(request.getLinkedAccountId());
        application.setDeliveryAddressId(request.getDeliveryAddressId());
        application.setStatus("PENDING_APPROVAL");
        application.setEstimatedDeliveryDate(LocalDate.now().plusDays(7));

        cardApplicationRepository.save(application);

        // Store idempotency key
        CardApplicationIdempotencyKey idem = new CardApplicationIdempotencyKey();
        idem.setIdempotencyKey(idempotencyKey);
        idem.setCardApplicationId(cardApplicationId);
        idempotencyKeyRepository.save(idem);

        CardApplicationResponse response = new CardApplicationResponse();
        response.setCardApplicationId(cardApplicationId);
        response.setCardType(application.getCardType());
        response.setStatus("PENDING_APPROVAL");
        response.setEstimatedDeliveryTime(application.getEstimatedDeliveryDate());
        return response;
    }
}
