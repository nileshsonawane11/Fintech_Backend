package com.fintech.loan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.loan.entity.LoanIdempotencyKey;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanIdempotencyKeyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class LoanIdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(LoanIdempotencyService.class);

    private final LoanIdempotencyKeyRepository repository;
    private final ObjectMapper objectMapper;
    private final long ttlHours;

    public LoanIdempotencyService(
            LoanIdempotencyKeyRepository repository,
            ObjectMapper objectMapper,
            @Value("${app.loan.idempotency-ttl-hours:24}") long ttlHours) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.ttlHours = ttlHours;
    }

    public String computeHash(Object payload) {
        try {
            String json = payload instanceof String s ? s : objectMapper.writeValueAsString(payload);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(json.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            return Integer.toHexString(String.valueOf(payload).hashCode());
        }
    }

    public <T> Optional<T> findReplay(String idempotencyKey, String operation, String identitySubject,
                                      String requestHash, Class<T> responseType) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }
        Optional<LoanIdempotencyKey> existingOpt =
                repository.findByIdempotencyKeyAndOperation(idempotencyKey.trim(), operation);
        if (existingOpt.isEmpty()) {
            return Optional.empty();
        }

        LoanIdempotencyKey existing = existingOpt.get();
        if (existing.getIdentitySubject() != null && identitySubject != null
                && !existing.getIdentitySubject().equals(identitySubject)) {
            throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT",
                    "Idempotency-Key was already used by a different principal.");
        }
        if (existing.getRequestHash() != null && requestHash != null
                && !existing.getRequestHash().equals(requestHash)) {
            throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_PAYLOAD_MISMATCH",
                    "Idempotency-Key was already used with a different request payload.");
        }
        if (existing.getResponsePayload() != null && !existing.getResponsePayload().isBlank()) {
            try {
                return Optional.of(objectMapper.readValue(existing.getResponsePayload(), responseType));
            } catch (Exception ex) {
                log.warn("Failed to deserialize cached idempotency payload for key {}: {}", idempotencyKey, ex.getMessage());
            }
        }
        throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_REQUEST",
                "A request with this Idempotency-Key has already been processed.");
    }

    @Transactional
    public void record(String idempotencyKey, String operation, String identitySubject,
                       String requestHash, String referenceId, Object response) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }
        LoanIdempotencyKey key = new LoanIdempotencyKey();
        key.setIdempotencyKey(idempotencyKey.trim());
        key.setOperation(operation);
        key.setIdentitySubject(identitySubject);
        key.setRequestHash(requestHash);
        key.setResponseReference(referenceId);
        key.setExpiresAt(Instant.now().plus(ttlHours, ChronoUnit.HOURS));
        try {
            key.setResponsePayload(objectMapper.writeValueAsString(response));
        } catch (Exception ex) {
            log.warn("Could not serialize idempotency response for key {}: {}", idempotencyKey, ex.getMessage());
        }
        repository.save(key);
    }
}
