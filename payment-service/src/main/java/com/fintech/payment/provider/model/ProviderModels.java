package com.fintech.payment.provider.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ProviderModels {

    private ProviderModels() {}

    public record ProviderCustomerRequest(
            String name,
            String email,
            String contact,
            String referenceId,
            Map<String, String> notes
    ) {}

    public record ProviderCustomerResult(
            String providerCustomerId,
            String name,
            String email
    ) {}

    public record CreateVirtualAccountCommand(
            String providerCustomerId,
            List<String> receiverTypes,
            String description,
            Instant closeBy,
            Map<String, String> notes
    ) {}

    public record VirtualAccountResult(
            String providerVaId,
            String providerCustomerId,
            String status,
            String name,
            String description,
            String bankAccountNumber,
            String bankIfsc,
            String bankName,
            String vpaAddress,
            Instant closeBy
    ) {}

    public record ProviderPaymentResult(
            String providerPaymentId,
            String providerVaId,
            BigDecimal amount,
            String currency,
            String status,
            String method,
            String payerName,
            String payerVpa,
            String payerBank,
            String utr,
            String errorCode,
            String errorDescription,
            Instant createdAt
    ) {}

    public record RefundPaymentCommand(
            String providerPaymentId,
            BigDecimal amount,
            String receipt,
            Map<String, String> notes
    ) {}

    public record RefundPaymentResult(
            String refundId,
            String providerPaymentId,
            BigDecimal amount,
            String currency,
            String status
    ) {}

    public record CreateContactCommand(
            String name,
            String email,
            String contact,
            String type,
            String referenceId,
            Map<String, String> notes
    ) {}

    public record ContactResult(
            String providerContactId,
            String name,
            String type
    ) {}

    public record CreateBankFundAccountCommand(
            String providerContactId,
            String accountHolderName,
            String ifscCode,
            String accountNumber
    ) {}

    public record CreateVpaFundAccountCommand(
            String providerContactId,
            String vpaAddress
    ) {}

    public record FundAccountResult(
            String providerFundAccountId,
            String providerContactId,
            String accountType,
            boolean active
    ) {}

    public record ValidateFundAccountCommand(
            String providerFundAccountId,
            String validationMode,
            long amountPaise,
            String currency,
            String referenceId,
            Map<String, String> notes
    ) {}

    public record ValidationResult(
            String providerValidationId,
            String providerFundAccountId,
            String status,
            String providerAccountStatus,
            String registeredName,
            String utr,
            String failureSource,
            String failureReason,
            String failureDescription
    ) {}

    public record CreatePayoutCommand(
            String idempotencyKey,
            String providerFundAccountId,
            BigDecimal amount,
            String currency,
            String mode,
            String purpose,
            String referenceId,
            String narration,
            Map<String, String> notes
    ) {}

    public record PayoutResult(
            String providerPayoutId,
            String providerFundAccountId,
            String status,
            BigDecimal amount,
            String currency,
            String mode,
            String utr,
            BigDecimal fees,
            BigDecimal tax,
            String failureSource,
            String failureReason,
            String failureDescription,
            boolean timedOut
    ) {}
}
