package com.fintech.payment.service;

import com.fintech.payment.dto.request.InitiateTransferRequest;
import com.fintech.payment.dto.response.ChargeDto;
import com.fintech.payment.dto.response.PaymentResponse;
import com.fintech.payment.dto.response.PaymentStatusResponse;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.entity.PaymentIdempotencyKey;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.repository.PaymentIdempotencyKeyRepository;
import com.fintech.payment.repository.PaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentIdempotencyKeyRepository idempotencyKeyRepository;
    private final BeneficiaryService beneficiaryService;

    public PaymentService(PaymentRepository paymentRepository,
                          PaymentIdempotencyKeyRepository idempotencyKeyRepository,
                          BeneficiaryService beneficiaryService) {
        this.paymentRepository = paymentRepository;
        this.idempotencyKeyRepository = idempotencyKeyRepository;
        this.beneficiaryService = beneficiaryService;
    }

    @Transactional
    public PaymentResponse initiateTransfer(String userId, String idempotencyKey, InitiateTransferRequest request) {
        validateIdempotencyKey(idempotencyKey);

        // Idempotency check
        idempotencyKeyRepository.findByIdempotencyKey(idempotencyKey).ifPresent(existing -> {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_REQUEST", "A payment with the same idempotency key already exists");
        });

        // Beneficiary active check (403 if not active)
        beneficiaryService.findActiveBeneficiary(userId, request.getBeneficiaryId());

        String paymentId = "PAY-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        String transactionId = "TXN-" + UUID.randomUUID().toString().replace("-", "").toUpperCase();

        Payment payment = new Payment();
        payment.setPaymentId(paymentId);
        payment.setTransactionId(transactionId);
        payment.setUserId(userId);
        payment.setDebitAccountId(request.getDebitAccountId());
        payment.setBeneficiaryId(request.getBeneficiaryId());
        payment.setAmount(request.getAmount());
        payment.setCurrency(request.getCurrency() != null ? request.getCurrency() : "INR");
        payment.setRemarks(request.getRemarks());
        payment.setTransferMode(request.getTransferMode());
        payment.setStatus("PENDING");

        paymentRepository.save(payment);

        // Store idempotency key
        PaymentIdempotencyKey idem = new PaymentIdempotencyKey();
        idem.setIdempotencyKey(idempotencyKey);
        idem.setPaymentId(paymentId);
        try {
            idempotencyKeyRepository.saveAndFlush(idem);
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            // The unique database constraint handles two concurrent submissions
            // that both pass the initial lookup.
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_REQUEST", "A payment with the same idempotency key already exists");
        }

        // Build response
        ChargeDto fee = new ChargeDto("TRANSFER_FEE", BigDecimal.ZERO, "INR");

        PaymentResponse response = new PaymentResponse();
        response.setPaymentId(paymentId);
        response.setTransactionId(transactionId);
        response.setStatus("PENDING");
        response.setAmount(request.getAmount());
        response.setCurrency(payment.getCurrency());
        response.setCharges(List.of(fee));
        response.setEstimatedCompletionTime(Instant.now().plus(3, ChronoUnit.MINUTES));
        return response;
    }

    private void validateIdempotencyKey(String idempotencyKey) {
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

    public PaymentStatusResponse getPaymentStatus(String userId, String paymentId) {
        Payment payment = paymentRepository.findByPaymentIdAndUserId(paymentId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                        "Payment not found: " + paymentId));

        PaymentStatusResponse response = new PaymentStatusResponse();
        response.setPaymentId(payment.getPaymentId());
        response.setTransactionId(payment.getTransactionId());
        response.setStatus(payment.getStatus());
        response.setAmount(payment.getAmount());
        response.setCurrency(payment.getCurrency());
        response.setTransferMode(payment.getTransferMode());
        response.setRailReference(payment.getRailReference());
        response.setCompletedAt(payment.getCompletedAt());
        return response;
    }
}
