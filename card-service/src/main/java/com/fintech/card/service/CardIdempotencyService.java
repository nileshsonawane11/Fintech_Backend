package com.fintech.card.service;

import com.fintech.card.domain.CanonicalCardApplication;
import com.fintech.card.entity.CardApplicationIdempotencyKey;
import com.fintech.card.exception.IdempotencyConflictException;
import com.fintech.card.repository.CardApplicationIdempotencyKeyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class CardIdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(CardIdempotencyService.class);

    private final CardApplicationIdempotencyKeyRepository idempotencyKeyRepository;

    public CardIdempotencyService(CardApplicationIdempotencyKeyRepository idempotencyKeyRepository) {
        this.idempotencyKeyRepository = idempotencyKeyRepository;
    }

    public String computeFingerprint(CanonicalCardApplication request) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = String.join("|",
                    request.cardType() != null ? request.cardType().toUpperCase() : "",
                    request.productSlug() != null ? request.productSlug().toLowerCase() : "",
                    request.linkedAccountId() != null ? request.linkedAccountId() : "",
                    request.deliveryAddressId() != null ? request.deliveryAddressId() : "",
                    request.requestedLimit() != null ? request.requestedLimit().stripTrailingZeros().toPlainString() : "0"
            );
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    public Optional<CardApplicationIdempotencyKey> findAndValidate(String idempotencyKey, String identitySubject, String requestHash) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }

        Optional<CardApplicationIdempotencyKey> existingOpt = idempotencyKeyRepository.findByIdempotencyKey(idempotencyKey);
        if (existingOpt.isEmpty()) {
            return Optional.empty();
        }

        CardApplicationIdempotencyKey existing = existingOpt.get();

        // 1. Validate identity subject ownership of this key
        boolean owned;
        if (existing.getIdentitySubject() != null) {
            owned = existing.getIdentitySubject().equalsIgnoreCase(identitySubject);
        } else {
            owned = existing.getCustomerId() == null || existing.getCustomerId().equalsIgnoreCase(identitySubject);
        }

        if (!owned) {
            log.warn("Idempotency conflict: key={} used by identitySubject={}, but previously recorded for owner={}",
                    idempotencyKey, identitySubject, existing.getIdentitySubject() != null ? existing.getIdentitySubject() : existing.getCustomerId());
            throw new IdempotencyConflictException(
                    "Idempotency-Key '" + idempotencyKey + "' has already been used by another customer.");
        }

        // 2. Validate request payload fingerprint
        if (existing.getRequestHash() != null && !existing.getRequestHash().equals(requestHash)) {
            log.warn("Idempotency conflict: key={} resubmitted with mismatched request fingerprint", idempotencyKey);
            throw new IdempotencyConflictException(
                    "Idempotency-Key '" + idempotencyKey + "' was already used with a different request payload.");
        }

        return Optional.of(existing);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public CardApplicationIdempotencyKey recordIdempotency(
            String idempotencyKey, String cardApplicationId, String identitySubject, String customerId, String requestHash, String responsePayload) {
        CardApplicationIdempotencyKey record = new CardApplicationIdempotencyKey();
        record.setIdempotencyKey(idempotencyKey);
        record.setCardApplicationId(cardApplicationId);
        record.setIdentitySubject(identitySubject);
        record.setCustomerId(customerId);
        record.setRequestHash(requestHash);
        record.setResponsePayload(responsePayload);
        return idempotencyKeyRepository.save(record);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public CardApplicationIdempotencyKey recordIdempotency(
            String idempotencyKey, String cardApplicationId, String customerId, String requestHash, String responsePayload) {
        return recordIdempotency(idempotencyKey, cardApplicationId, customerId, customerId, requestHash, responsePayload);
    }
}
