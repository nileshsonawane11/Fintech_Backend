package com.fintech.loan.client.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class PaymentDtos {

    private PaymentDtos() {}

    public record InitiateCollectionRequest(
            String sourceService,
            String businessReference,
            String customerId,
            String paymentMethod,
            BigDecimal amount,
            String currency,
            String mandateReference,
            String vpaOrInstrumentRef
    ) {}

    public record CollectionOrderResponse(
            String collectionReference,
            String businessReference,
            String providerName,
            String providerReference,
            String paymentMethod,
            BigDecimal amount,
            String currency,
            String status,
            String failureCode,
            String failureReason,
            String refundReference,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record RefundCollectionRequest(String reason) {}

    public record RegisterMandateRequest(
            String sourceService,
            String mandateReference,
            String customerId,
            String mandateType,
            BigDecimal maxAmount,
            String frequency,
            LocalDate startDate,
            LocalDate endDate
    ) {}

    public record MandateRegistrationResponse(
            String mandateReference,
            String providerReference,
            String mandateType,
            String providerName,
            BigDecimal maxAmount,
            String frequency,
            LocalDate startDate,
            LocalDate endDate,
            String status,
            String failureReason,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
