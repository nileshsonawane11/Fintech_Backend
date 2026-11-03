package com.fintech.account.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.account.dto.response.AccountApplicationResponse;
import com.fintech.account.entity.IdempotencyRecord;
import com.fintech.account.enums.ApplicationStatus;
import com.fintech.account.enums.ProcessingStatus;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.IdempotencyRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    @Mock
    private IdempotencyRecordRepository idempotencyRecordRepository;

    private ObjectMapper objectMapper;
    private IdempotencyService idempotencyService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        idempotencyService = new IdempotencyService(idempotencyRecordRepository, objectMapper);
    }

    @Test
    void execute_firstTime_shouldExecuteAndStoreCompleted_Scenario3() {
        String key = "key-uuid-1234";
        Map<String, String> request = Map.of("productCode", "SAVINGS_REGULAR");

        when(idempotencyRecordRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());

        AtomicInteger callCount = new AtomicInteger(0);
        AccountApplicationResponse response = idempotencyService.execute(
                key, "APPLY", request, AccountApplicationResponse.class, () -> {
                    callCount.incrementAndGet();
                    return AccountApplicationResponse.ofSummary(
                            "ACC-APP-900123", "CUS-100234", "SAVINGS_REGULAR", ApplicationStatus.PENDING_APPROVAL, null);
                });

        assertNotNull(response);
        assertEquals("ACC-APP-900123", response.accountApplicationId());
        assertEquals(1, callCount.get());

        verify(idempotencyRecordRepository, atLeastOnce()).save(any(IdempotencyRecord.class));
    }

    @Test
    void execute_secondTimeWithSamePayload_shouldReturnCachedWithoutExecuting_Scenario3() throws Exception {
        String key = "key-uuid-1234";
        Map<String, String> request = Map.of("productCode", "SAVINGS_REGULAR");

        AccountApplicationResponse cachedResp = AccountApplicationResponse.ofSummary(
                "ACC-APP-900123", "CUS-100234", "SAVINGS_REGULAR", ApplicationStatus.PENDING_APPROVAL, null);
        String cachedJson = objectMapper.writeValueAsString(cachedResp);

        IdempotencyRecord existingRecord = new IdempotencyRecord();
        existingRecord.setIdempotencyKey(key);
        existingRecord.setOperation("APPLY");
        // We calculate the hash for the same payload:
        String hash = "c2b6be0079a29633e689db7a95610ec871b619e0aa75429a1b183424d52e5a59"; // will be matched by computeHash
        // To be exact:
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] b = md.digest(objectMapper.writeValueAsString(request).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            hash = java.util.HexFormat.of().formatHex(b);
        } catch (Exception ignored) {}
        existingRecord.setRequestHash(hash);
        existingRecord.setProcessingStatus(ProcessingStatus.COMPLETED);
        existingRecord.setResponseBody(cachedJson);

        when(idempotencyRecordRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(existingRecord));

        AtomicInteger callCount = new AtomicInteger(0);
        AccountApplicationResponse response = idempotencyService.execute(
                key, "APPLY", request, AccountApplicationResponse.class, () -> {
                    callCount.incrementAndGet();
                    return AccountApplicationResponse.ofSummary("NEW", "NEW", "NEW", ApplicationStatus.PENDING_APPROVAL, null);
                });

        assertNotNull(response);
        assertEquals("ACC-APP-900123", response.accountApplicationId());
        assertEquals(0, callCount.get()); // Logic was NOT called again
    }

    @Test
    void execute_withDifferentPayloadHash_shouldThrowConflict() {
        String key = "key-uuid-1234";
        Map<String, String> request = Map.of("productCode", "SAVINGS_REGULAR");

        IdempotencyRecord existingRecord = new IdempotencyRecord();
        existingRecord.setIdempotencyKey(key);
        existingRecord.setRequestHash("DIFFERENT_HASH_123");
        existingRecord.setProcessingStatus(ProcessingStatus.COMPLETED);

        when(idempotencyRecordRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(existingRecord));

        AccountException ex = assertThrows(AccountException.class, () ->
                idempotencyService.execute(key, "APPLY", request, AccountApplicationResponse.class, () -> null));

        assertEquals("IDEMPOTENCY_KEY_REUSED", ex.getCode());
    }

    @Test
    void execute_whenPending_shouldThrowConflict() throws Exception {
        String key = "key-uuid-1234";
        Map<String, String> request = Map.of("productCode", "SAVINGS_REGULAR");

        java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
        byte[] b = md.digest(objectMapper.writeValueAsString(request).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String hash = java.util.HexFormat.of().formatHex(b);

        IdempotencyRecord existingRecord = new IdempotencyRecord();
        existingRecord.setIdempotencyKey(key);
        existingRecord.setRequestHash(hash);
        existingRecord.setProcessingStatus(ProcessingStatus.PENDING);

        when(idempotencyRecordRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(existingRecord));

        AccountException ex = assertThrows(AccountException.class, () ->
                idempotencyService.execute(key, "APPLY", request, AccountApplicationResponse.class, () -> null));

        assertEquals("OPERATION_IN_PROGRESS", ex.getCode());
    }
}
