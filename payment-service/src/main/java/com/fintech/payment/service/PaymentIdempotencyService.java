package com.fintech.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.entity.PaymentIdempotencyKey;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.PaymentIdempotencyKeyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentIdempotencyService {

    private final PaymentIdempotencyKeyRepository idempotencyKeyRepository;
    private final ObjectMapper objectMapper;
    private final long ttlHours;

    public PaymentIdempotencyService(
            PaymentIdempotencyKeyRepository idempotencyKeyRepository,
            ObjectMapper objectMapper,
            @Value("${payment.idempotency.ttl-hours:" + PaymentConstants.DEFAULT_IDEMPOTENCY_TTL_HOURS + "}") long ttlHours) {
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.objectMapper = objectMapper;
        this.ttlHours = ttlHours;
    }

    public void validateUuidHeader(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Idempotency-Key header is required");
        }
        try {
            if (!UUID.fromString(idempotencyKey).toString().equalsIgnoreCase(idempotencyKey)) {
                throw new IllegalArgumentException("Idempotency key is not a canonical UUID");
            }
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Idempotency-Key must be a UUID");
        }
    }

    public String computeHash(Object payload) {
        try {
            String json = payload == null ? "null" : objectMapper.writeValueAsString(payload);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(json.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not compute idempotency request hash", ex);
        }
    }

    @Transactional
    public <T> Optional<T> checkOrLock(
            String idempotencyKey,
            String operation,
            String userId,
            String pendingResourceId,
            Object requestPayload,
            Class<T> responseType) {

        validateUuidHeader(idempotencyKey);
        String requestHash = computeHash(requestPayload);

        Optional<PaymentIdempotencyKey> existingOpt = idempotencyKeyRepository.findByIdempotencyKey(idempotencyKey);
        if (existingOpt.isPresent()) {
            PaymentIdempotencyKey existing = existingOpt.get();
            if (existing.getRequestHash() != null && !existing.getRequestHash().equals(requestHash)) {
                throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED",
                        "Idempotency-Key has already been used with a different request payload");
            }
            if ("PROCESSING".equalsIgnoreCase(existing.getProcessingStatus())) {
                throw new ApiException(HttpStatus.CONFLICT, "CONCURRENT_PAYMENT_REQUEST",
                        "A request with this Idempotency-Key is currently in progress");
            }
            if ("COMPLETED".equalsIgnoreCase(existing.getProcessingStatus()) && existing.getResponseBody() != null) {
                try {
                    return Optional.of(objectMapper.readValue(existing.getResponseBody(), responseType));
                } catch (Exception ex) {
                    throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_REQUEST",
                            "A payment with the same idempotency key already exists");
                }
            }
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_REQUEST",
                    "A payment with the same idempotency key already exists");
        }

        PaymentIdempotencyKey lock = new PaymentIdempotencyKey();
        lock.setIdempotencyKey(idempotencyKey);
        lock.setOperation(operation);
        lock.setUserId(userId);
        lock.setPaymentId(pendingResourceId);
        lock.setRequestHash(requestHash);
        lock.setProcessingStatus("PROCESSING");
        lock.setExpiresAt(Instant.now().plus(ttlHours, ChronoUnit.HOURS));
        try {
            idempotencyKeyRepository.saveAndFlush(lock);
        } catch (DataIntegrityViolationException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_REQUEST",
                    "A payment with the same idempotency key already exists");
        }
        return Optional.empty();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCompleted(String idempotencyKey, String resourceId, int statusCode, Object responseBody) {
        idempotencyKeyRepository.findByIdempotencyKey(idempotencyKey).ifPresent(record -> {
            record.setPaymentId(resourceId);
            record.setResponseStatus(statusCode);
            record.setProcessingStatus("COMPLETED");
            if (responseBody != null) {
                try {
                    record.setResponseBody(objectMapper.writeValueAsString(responseBody));
                } catch (Exception ignored) {}
            }
            idempotencyKeyRepository.save(record);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void releaseOnFailure(String idempotencyKey) {
        idempotencyKeyRepository.findByIdempotencyKey(idempotencyKey).ifPresent(idempotencyKeyRepository::delete);
    }
}
