package com.fintech.account.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.account.entity.IdempotencyRecord;
import com.fintech.account.enums.ProcessingStatus;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.IdempotencyRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;
import java.util.function.Supplier;

@Service
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);

    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyRecordRepository idempotencyRecordRepository, ObjectMapper objectMapper) {
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.objectMapper = objectMapper;
    }

    public <T> T execute(String idempotencyKey, String operation, Object requestPayload, Class<T> responseClass, Supplier<T> businessLogic) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return businessLogic.get();
        }

        String requestHash = computeHash(requestPayload);

        Optional<IdempotencyRecord> existingOpt = idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey);
        if (existingOpt.isPresent()) {
            IdempotencyRecord record = existingOpt.get();

            if (!record.getRequestHash().equals(requestHash)) {
                log.warn("Idempotency key {} reused with different payload hash", idempotencyKey);
                throw AccountException.conflict("IDEMPOTENCY_KEY_REUSED",
                        "Idempotency key has already been used with a different request payload.");
            }

            if (record.getProcessingStatus() == ProcessingStatus.PENDING) {
                log.warn("Idempotency key {} operation is still pending", idempotencyKey);
                throw AccountException.conflict("OPERATION_IN_PROGRESS",
                        "Operation for this idempotency key is currently being processed.");
            }

            if (record.getProcessingStatus() == ProcessingStatus.COMPLETED) {
                log.info("Idempotent request detected for key {}. Returning cached response.", idempotencyKey);
                try {
                    return objectMapper.readValue(record.getResponseBody(), responseClass);
                } catch (Exception e) {
                    log.error("Failed to deserialize cached idempotent response: {}", e.getMessage());
                    throw new IllegalStateException("Failed to parse cached idempotent response", e);
                }
            }
        }

        // Create pending record
        IdempotencyRecord pendingRecord = new IdempotencyRecord();
        pendingRecord.setIdempotencyKey(idempotencyKey);
        pendingRecord.setOperation(operation);
        pendingRecord.setRequestHash(requestHash);
        pendingRecord.setProcessingStatus(ProcessingStatus.PENDING);
        pendingRecord.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        idempotencyRecordRepository.save(pendingRecord);

        T result;
        try {
            result = businessLogic.get();
        } catch (Exception ex) {
            pendingRecord.setProcessingStatus(ProcessingStatus.FAILED);
            idempotencyRecordRepository.save(pendingRecord);
            throw ex;
        }

        try {
            String jsonResult = objectMapper.writeValueAsString(result);
            pendingRecord.setProcessingStatus(ProcessingStatus.COMPLETED);
            pendingRecord.setResponseStatus(200);
            pendingRecord.setResponseBody(jsonResult);
            idempotencyRecordRepository.save(pendingRecord);
        } catch (Exception e) {
            log.warn("Could not cache response for idempotency key {}: {}", idempotencyKey, e.getMessage());
        }

        return result;
    }

    private String computeHash(Object payload) {
        if (payload == null) {
            return "EMPTY";
        }
        try {
            String json = payload instanceof String str ? str : objectMapper.writeValueAsString(payload);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException | com.fasterxml.jackson.core.JsonProcessingException e) {
            return String.valueOf(payload.hashCode());
        }
    }
}
