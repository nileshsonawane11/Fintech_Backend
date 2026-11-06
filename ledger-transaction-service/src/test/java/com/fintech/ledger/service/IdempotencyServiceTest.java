package com.fintech.ledger.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.ledger.dto.response.TransferResponse;
import com.fintech.ledger.entity.IdempotencyRecord;
import com.fintech.ledger.enums.ProcessingStatus;
import com.fintech.ledger.enums.TransactionStatus;
import com.fintech.ledger.enums.TransactionType;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.repository.IdempotencyRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    @Mock
    private IdempotencyRecordRepository idempotencyRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private IdempotencyService idempotencyService;

    private Map<String, Object> requestPayload;
    private String computedHash;

    @BeforeEach
    void setUp() {
        requestPayload = Map.of("sourceAccountId", "ACC-1001", "amount", 15000);
        computedHash = idempotencyService.computeHash(requestPayload);
    }

    @Test
    @DisplayName("Idempotency Test: New key creates PROCESSING record and returns empty")
    void checkIdempotency_whenNewKey_shouldCreateRecordAndReturnEmpty() {
        when(idempotencyRepository.findByIdempotencyKey("key-1")).thenReturn(Optional.empty());

        Optional<TransferResponse> result = idempotencyService.checkIdempotency(
                "key-1", "TRANSFER", requestPayload, TransferResponse.class);

        assertTrue(result.isEmpty());
        verify(idempotencyRepository).save(any(IdempotencyRecord.class));
    }

    @Test
    @DisplayName("Idempotency Test: Same key and identical payload returns original cached response")
    void checkIdempotency_whenCompletedWithSamePayload_shouldReturnCachedResponse() throws Exception {
        TransferResponse cachedResponse = new TransferResponse(
                "TXN-1", TransactionStatus.SUCCESS, TransactionType.TRANSFER, new BigDecimal("15000"), "INR", "ACC-1", "ACC-2", "REF", Instant.now());

        IdempotencyRecord record = new IdempotencyRecord(UUID.randomUUID(), "key-1", "TRANSFER", computedHash, Instant.now().plusSeconds(3600));
        record.setProcessingStatus(ProcessingStatus.COMPLETED);
        record.setResponseStatus(201);
        record.setResponseBody(objectMapper.writeValueAsString(cachedResponse));

        when(idempotencyRepository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

        Optional<TransferResponse> result = idempotencyService.checkIdempotency(
                "key-1", "TRANSFER", requestPayload, TransferResponse.class);

        assertTrue(result.isPresent());
        assertEquals("TXN-1", result.get().transactionId());
    }

    @Test
    @DisplayName("Idempotency Test: Same key with different payload throws 409 IDEMPOTENCY_KEY_REUSED")
    void checkIdempotency_whenKeyReusedWithDifferentPayload_shouldThrowConflict() {
        IdempotencyRecord record = new IdempotencyRecord(UUID.randomUUID(), "key-1", "TRANSFER", "different-hash-1234", Instant.now().plusSeconds(3600));

        when(idempotencyRepository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

        LedgerException ex = assertThrows(LedgerException.class, () ->
                idempotencyService.checkIdempotency("key-1", "TRANSFER", requestPayload, TransferResponse.class));

        assertEquals("IDEMPOTENCY_KEY_REUSED", ex.getErrorCode());
    }

    @Test
    @DisplayName("Idempotency Test: Concurrent in-flight request throws 409 CONCURRENT_REQUEST")
    void checkIdempotency_whenStillProcessing_shouldThrowConcurrentRequest() {
        IdempotencyRecord record = new IdempotencyRecord(UUID.randomUUID(), "key-1", "TRANSFER", computedHash, Instant.now().plusSeconds(3600));
        record.setProcessingStatus(ProcessingStatus.PROCESSING);

        when(idempotencyRepository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

        LedgerException ex = assertThrows(LedgerException.class, () ->
                idempotencyService.checkIdempotency("key-1", "TRANSFER", requestPayload, TransferResponse.class));

        assertEquals("CONCURRENT_REQUEST", ex.getErrorCode());
    }
}
