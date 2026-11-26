package com.fintech.payment.dto.internal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class InternalPaymentDtos {

    private InternalPaymentDtos() {}

    public record InitiateCollectionRequest(
            @NotBlank String sourceService,
            @NotBlank String businessReference,
            @NotBlank String customerId,
            @NotBlank String paymentMethod,
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotBlank String currency,
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

    public record RefundCollectionRequest(
            @NotBlank String reason
    ) {}

    public record RegisterMandateRequest(
            @NotBlank String sourceService,
            @NotBlank String mandateReference,
            @NotBlank String customerId,
            @NotBlank String mandateType,
            @NotNull @DecimalMin("1.00") BigDecimal maxAmount,
            @NotBlank String frequency,
            @NotNull LocalDate startDate,
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
