package com.fintech.investment.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class ExternalDtos {

    private ExternalDtos() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CustomerProfileDto(
            String customerId,
            String fullName,
            LocalDate dateOfBirth,
            String mobileNumber,
            String email,
            String kycStatus,
            String riskCategory
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record InternalAccountDto(
            String accountId,
            String accountNumberMasked,
            String customerId,
            String identitySubject,
            String accountType,
            String productCode,
            String status,
            String currency,
            Instant openedAt
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LedgerBalanceDto(
            String accountId,
            BigDecimal ledgerBalance,
            BigDecimal availableBalance,
            String currency
    ) {}

    public record PostingEntryRequest(
            String accountId,
            String entryType,
            BigDecimal amount,
            String narrative,
            String referenceNumber
    ) {}

    public record MultiLinePostingRequest(
            String transactionType,
            String currency,
            String correlationId,
            String narrative,
            String referenceNumber,
            List<PostingEntryRequest> entries
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LedgerPostingResponseDto(
            String transactionId,
            String status,
            BigDecimal amount,
            String currency,
            String debitLedgerEntryId,
            String creditLedgerEntryId,
            List<String> entryIds,
            Instant postedAt
    ) {}

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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MandateRegistrationResponse(
            String mandateReference,
            String providerReference,
            String status,
            String failureReason
    ) {}

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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CollectionOrderResponse(
            String collectionReference,
            String businessReference,
            String status,
            String failureCode,
            String failureReason
    ) {}
}
