package com.fintech.payment.service;

import com.fintech.payment.dto.request.InitiateTransferRequest;
import com.fintech.payment.entity.PaymentIdempotencyKey;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.PaymentIdempotencyKeyRepository;
import com.fintech.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentServiceTest {

    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final PaymentIdempotencyKeyRepository idempotencyKeyRepository =
            mock(PaymentIdempotencyKeyRepository.class);
    private final BeneficiaryService beneficiaryService = mock(BeneficiaryService.class);
    private final PaymentService paymentService =
            new PaymentService(paymentRepository, idempotencyKeyRepository, beneficiaryService);

    @Test
    void rejectsMissingIdempotencyKeyAsBadRequest() {
        ApiException exception = assertThrows(ApiException.class,
                () -> paymentService.initiateTransfer("customer-1", null, new InitiateTransferRequest()));

        assertEquals("VALIDATION_FAILED", exception.getCode());
        assertEquals(400, exception.getHttpStatus().value());
        verify(idempotencyKeyRepository, never()).findByIdempotencyKey(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void rejectsMalformedIdempotencyKeyAsBadRequest() {
        ApiException exception = assertThrows(ApiException.class,
                () -> paymentService.initiateTransfer("customer-1", "not-a-uuid", new InitiateTransferRequest()));

        assertEquals("VALIDATION_FAILED", exception.getCode());
        assertEquals(400, exception.getHttpStatus().value());
    }

    @Test
    void returnsConflictWhenIdempotencyKeyWasAlreadyUsed() {
        String idempotencyKey = UUID.randomUUID().toString();
        when(idempotencyKeyRepository.findByIdempotencyKey(idempotencyKey))
                .thenReturn(Optional.of(new PaymentIdempotencyKey()));

        ApiException exception = assertThrows(ApiException.class,
                () -> paymentService.initiateTransfer("customer-1", idempotencyKey,
                        new InitiateTransferRequest()));

        assertEquals("DUPLICATE_PAYMENT_REQUEST", exception.getCode());
        assertEquals(409, exception.getHttpStatus().value());
    }
}
