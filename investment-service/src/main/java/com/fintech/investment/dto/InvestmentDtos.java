package com.fintech.investment.dto;

import com.fintech.investment.calculator.CalculationDtos.CompoundingFrequency;
import com.fintech.investment.calculator.CalculationDtos.PayoutFrequency;
import com.fintech.investment.entity.InvestmentEnums.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class InvestmentDtos {

    private InvestmentDtos() {}

    public record CreateApplicationRequest(
            @NotBlank String productCode,
            @NotNull @DecimalMin("1.00") BigDecimal amount,
            @Min(1) Integer tenureMonths,
            Integer tenureDays,
            CompoundingFrequency compoundingFrequency,
            PayoutFrequency payoutFrequency,
            Boolean autoRenewal,
            @NotBlank String fundingAccountId,
            String nomineeName,
            String nomineeRelationship,
            LocalDate nomineeDob,
            SipFundCategory sipFundCategory,
            @Min(1) @Max(28) Integer sipDebitDay,
            @DecimalMin("0.00") @DecimalMax("30.00") BigDecimal sipAssumedReturnPct,
            String ssyGirlChildName,
            LocalDate ssyGirlChildDob,
            String ssyGuardianName,
            String ssyGuardianRelationship,
            Boolean ssyFamilyException,
            @NotNull @AssertTrue(message = "Customer consent and regulatory disclosures must be accepted")
            Boolean consentAccepted,
            String disclosureVersion,
            Boolean immediateBook
    ) {}

    public record ApplicationResponse(
            String applicationId,
            String identitySubject,
            String customerId,
            String productCode,
            ProductType productType,
            ApplicationStatus status,
            String currency,
            BigDecimal requestedAmount,
            BigDecimal monthlyAmount,
            Integer tenureMonths,
            Integer tenureDays,
            BigDecimal appliedRate,
            BigDecimal projectedMaturityAmount,
            BigDecimal projectedInterest,
            String payoutFrequency,
            boolean autoRenewal,
            String fundingAccountId,
            String fundingAccountMasked,
            String sipFundCategory,
            Integer sipDebitDay,
            String ssyGirlChildName,
            LocalDate ssyGirlChildDob,
            String ssyGuardianName,
            String kycStatusAtApply,
            String remarks,
            String rejectionReason,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record InvestmentResponse(
            String investmentId,
            String applicationId,
            String identitySubject,
            String customerId,
            String productCode,
            ProductType productType,
            InvestmentStatus status,
            String currency,
            BigDecimal principalAmount,
            BigDecimal monthlyAmount,
            BigDecimal totalInvested,
            BigDecimal interestRate,
            Instant rateLockedAt,
            String compoundingFrequency,
            String payoutFrequency,
            Integer tenureMonths,
            Integer tenureDays,
            LocalDate startDate,
            LocalDate maturityDate,
            BigDecimal maturityAmount,
            BigDecimal accruedInterest,
            BigDecimal projectedGain,
            boolean returnsGuaranteed,
            boolean isMarketLinked,
            boolean isGovernmentScheme,
            String disclosure,
            String fundingAccountId,
            String fundingAccountMasked,
            boolean autoRenewal,
            String maturityInstruction,
            boolean loanAgainstFdActive,
            BigDecimal maxLoanAgainstFdEligible,
            String sipFundCategory,
            Integer sipDebitDay,
            String ssyGirlChildName,
            LocalDate ssyDepositEndDate,
            String certificateNumber,
            Instant createdAt
    ) {}

    public record CertificateResponse(
            String certificateNumber,
            String investmentId,
            String productCode,
            ProductType productType,
            String holderSubject,
            BigDecimal principalOrMonthly,
            BigDecimal totalInvested,
            BigDecimal lockedInterestRate,
            LocalDate startDate,
            LocalDate maturityDate,
            BigDecimal maturityValue,
            String fundingAccountMasked,
            boolean returnsGuaranteed,
            String disclaimer,
            Instant issuedAt
    ) {}

    public record InstallmentScheduleResponse(
            String scheduleId,
            Integer installmentNumber,
            LocalDate dueDate,
            BigDecimal amount,
            InstallmentStatus status,
            BigDecimal paidAmount,
            BigDecimal penaltyAmount,
            Instant paidAt,
            String transactionRef,
            Integer retryCount,
            String failureReason
    ) {}

    public record TransactionResponse(
            String transactionId,
            String investmentId,
            TransactionType transactionType,
            TransactionDirection direction,
            BigDecimal amount,
            String currency,
            TransactionStatus status,
            String accountId,
            String ledgerTransactionId,
            String remarks,
            Instant createdAt,
            Instant completedAt
    ) {}

    public record SipModifyRequest(
            @DecimalMin("1.00") BigDecimal monthlyAmount,
            @Min(1) @Max(28) Integer debitDay,
            SipFundCategory fundCategory
    ) {}

    public record AutoRenewalRequest(
            boolean autoRenewal,
            String maturityInstruction
    ) {}

    public record WithdrawalRequestDto(
            @NotNull WithdrawalRequestType requestType,
            BigDecimal requestedAmount,
            String payoutAccountId,
            @Size(max = 400) String reason
    ) {}

    public record WithdrawalResponse(
            String requestId,
            String investmentId,
            WithdrawalRequestType requestType,
            BigDecimal requestedAmount,
            BigDecimal penaltyAmount,
            BigDecimal netPayoutAmount,
            String payoutAccountId,
            WithdrawalStatus status,
            String eligibilityNote,
            String transactionRef,
            Instant createdAt,
            Instant processedAt
    ) {}

    public record DocumentUploadRequest(
            @NotBlank String documentType,
            @NotBlank String fileName,
            @NotBlank String contentType,
            @NotNull @Min(1) @Max(10485760) Long fileSizeBytes,
            @NotBlank String checksumSha256
    ) {}

    public record DocumentResponse(
            String documentId,
            String applicationId,
            String documentType,
            String fileName,
            String contentType,
            Long fileSizeBytes,
            String verificationStatus,
            String verifiedBy,
            Instant verifiedAt,
            Instant createdAt
    ) {}

    public record StaffDecisionRequest(
            @Size(max = 500) String remarks,
            String rejectionReason
    ) {}

    public record SsyDepositRequest(
            @NotNull @DecimalMin("250.00") @DecimalMax("150000.00") BigDecimal amount,
            String fundingAccountId
    ) {}

    public record OpsDashboardResponse(
            List<ApplicationResponse> pendingApplications,
            List<TransactionResponse> failedTransactions,
            List<InstallmentScheduleResponse> failedInstallments,
            List<DocumentResponse> pendingDocuments,
            List<InvestmentResponse> maturingInvestments,
            List<WithdrawalResponse> pendingWithdrawals,
            long failedOutboxCount,
            long openReconciliationsCount,
            long openAlertsCount
    ) {}
}
