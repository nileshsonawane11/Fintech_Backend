package com.fintech.investment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.investment.entity.InvestmentIdempotencyKey;
import com.fintech.investment.exception.ApiException;
import com.fintech.investment.repository.InvestmentIdempotencyKeyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class InvestmentIdempotencyService {

    private final InvestmentIdempotencyKeyRepository repository;
    private final ObjectMapper objectMapper;
    private final long ttlHours;

    public InvestmentIdempotencyService(
            InvestmentIdempotencyKeyRepository repository,
            ObjectMapper objectMapper,
            @Value("${app.investment.idempotency-ttl-hours:24}") long ttlHours) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.ttlHours = ttlHours;
    }

    public <T> Optional<T> checkReplay(String idempotencyKey, String operation, String subject,
                                       Object requestBody, Class<T> responseType) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }
        Optional<InvestmentIdempotencyKey> existingOpt =
                repository.findByIdempotencyKeyAndOperation(idempotencyKey.trim(), operation);
        if (existingOpt.isEmpty()) {
            return Optional.empty();
        }
        InvestmentIdempotencyKey existing = existingOpt.get();
        if (!existing.getIdentitySubject().equals(subject)) {
            throw ApiException.conflict("IDEMPOTENCY_CONFLICT",
                    "Idempotency-Key belongs to a different user.");
        }
        String hash = hashPayload(requestBody);
        if (!existing.getRequestHash().equals(hash)) {
            throw ApiException.conflict("IDEMPOTENCY_PAYLOAD_MISMATCH",
                    "Idempotency-Key reused with a different request payload.");
        }
        if ("COMPLETED".equals(existing.getStatus()) && existing.getResponsePayload() != null) {
            try {
                return Optional.of(objectMapper.readValue(existing.getResponsePayload(), responseType));
            } catch (Exception e) {
                throw ApiException.conflict("IDEMPOTENCY_REPLAY_ERROR", "Unable to replay cached response.");
            }
        }
        throw ApiException.conflict("OPERATION_IN_PROGRESS", "Request with this Idempotency-Key is already in progress.");
    }

    @Transactional
    public void recordSuccess(String idempotencyKey, String operation, String subject,
                              Object requestBody, Object responseBody, int httpStatus) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }
        String key = idempotencyKey.trim();
        if (repository.findByIdempotencyKeyAndOperation(key, operation).isPresent()) {
            return;
        }
        InvestmentIdempotencyKey record = new InvestmentIdempotencyKey();
        record.setIdempotencyKey(key);
        record.setOperation(operation);
        record.setIdentitySubject(subject);
        record.setRequestHash(hashPayload(requestBody));
        record.setStatus("COMPLETED");
        record.setHttpStatus(httpStatus);
        record.setExpiresAt(Instant.now().plus(ttlHours, ChronoUnit.HOURS));
        try {
            record.setResponsePayload(objectMapper.writeValueAsString(responseBody));
        } catch (Exception e) {
            record.setResponsePayload("{}");
        }
        repository.save(record);
    }

    private String hashPayload(Object body) {
        try {
            String json = objectMapper.writeValueAsString(body);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(json.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return String.valueOf(body);
        }
    }
}
