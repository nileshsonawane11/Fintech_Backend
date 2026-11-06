package com.fintech.ledger.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.ledger.entity.IdempotencyRecord;
import com.fintech.ledger.enums.ProcessingStatus;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.IdempotencyRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);

    private final IdempotencyRecordRepository idempotencyRepository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyRecordRepository idempotencyRepository, ObjectMapper objectMapper) {
        this.idempotencyRepository = idempotencyRepository;
        this.objectMapper = objectMapper;
    }

    public String computeHash(Object request) {
        if (request == null) {
            return "empty-payload";
        }
        try {
            String json = objectMapper.writeValueAsString(request);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            return Integer.toHexString(request.hashCode());
        }
    }

    @Transactional
    public <T> Optional<T> checkIdempotency(String idempotencyKey, String operation, Object requestPayload, Class<T> responseType) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }

        String requestHash = computeHash(requestPayload);
        Optional<IdempotencyRecord> recordOpt = idempotencyRepository.findByIdempotencyKey(idempotencyKey);

        if (recordOpt.isPresent()) {
            IdempotencyRecord record = recordOpt.get();

            if (!record.getRequestHash().equals(requestHash)) {
                log.warn("Idempotency key {} reused with different payload", idempotencyKey);
                throw LedgerException.idempotencyKeyReused("Idempotency key has already been used with a different request payload");
            }

            if (record.getProcessingStatus() == ProcessingStatus.PROCESSING) {
                log.warn("Concurrent request detected for idempotency key {}", idempotencyKey);
                throw LedgerException.conflict("CONCURRENT_REQUEST", "A request with this idempotency key is currently in progress");
            }

            if (record.getProcessingStatus() == ProcessingStatus.COMPLETED && record.getResponseBody() != null) {
                log.info("Returning cached response for idempotency key: {}", idempotencyKey);
                try {
                    return Optional.of(objectMapper.readValue(record.getResponseBody(), responseType));
                } catch (Exception ex) {
                    log.error("Failed to deserialize cached idempotency response: {}", ex.getMessage());
                }
            }
        } else {
            // Save initial in-progress record
            IdempotencyRecord record = new IdempotencyRecord(
                    UUID.randomUUID(),
                    idempotencyKey,
                    operation,
                    requestHash,
                    Instant.now().plusSeconds(86400)
            );
            idempotencyRepository.save(record);
        }

        return Optional.empty();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(String idempotencyKey, UUID resourceId, int statusCode, Object responseBody) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }

        try {
            Optional<IdempotencyRecord> recordOpt = idempotencyRepository.findByIdempotencyKey(idempotencyKey);
            IdempotencyRecord record = recordOpt.orElseGet(() -> {
                IdempotencyRecord r = new IdempotencyRecord();
                r.setIdempotencyKey(idempotencyKey);
                r.setOperation("UNKNOWN");
                r.setRequestHash("N/A");
                return r;
            });

            record.setResourceId(resourceId);
            record.setResponseStatus(statusCode);
            record.setProcessingStatus(ProcessingStatus.COMPLETED);
            if (responseBody != null) {
                record.setResponseBody(objectMapper.writeValueAsString(responseBody));
            }
            idempotencyRepository.save(record);
            log.info("Idempotency record completed for key: {}", idempotencyKey);
        } catch (Exception ex) {
            log.error("Failed to record idempotency success for key {}: {}", idempotencyKey, ex.getMessage());
        }
    }
}
