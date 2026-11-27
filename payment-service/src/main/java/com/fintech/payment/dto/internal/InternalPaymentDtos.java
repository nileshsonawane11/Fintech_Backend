package com.fintech.payment.dto.internal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public final class InternalPaymentDtos {

    private InternalPaymentDtos() {}

    public record InitiateCollectionRequest(
            @NotBlank String sourceService,
            @NotBlank String businessReference,
            @NotBlank String customerId,
            String identitySubject,
            String destinationAccountId,
            @NotBlank String paymentMethod,
            @NotNull @DecimalMin("1.00") BigDecimal amount,
            @NotBlank String currency,
            String mandateReference,
            String remarks
    ) {}

    public record CollectionOrderResponse(
            String collectionReference,
            String sourceService,
            String businessReference,
            String customerId,
            String paymentMethod,
            BigDecimal amount,
            String currency,
            String providerName,
            String providerReference,
            String razorpayOrderId,
            String keyId,
            String status,
            String failureCode,
            String failureReason
    ) {}

    public record RefundCollectionRequest(
            @NotBlank String reason,
            BigDecimal amount
    ) {}
}
