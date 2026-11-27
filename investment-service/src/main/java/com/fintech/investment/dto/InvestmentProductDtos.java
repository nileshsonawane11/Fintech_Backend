package com.fintech.investment.dto;

import com.fintech.investment.entity.InvestmentEnums.ProductStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class InvestmentProductDtos {

    private InvestmentProductDtos() {}

    public record RateSlabRequest(
            @NotNull @Min(1) Integer minTenureDays,
            @NotNull @Min(1) Integer maxTenureDays,
            @NotNull @DecimalMin("0.01") BigDecimal minAmount,
            @NotNull @DecimalMin("0.01") BigDecimal maxAmount,
            @NotNull @DecimalMin("0.01") @DecimalMax("50.00") BigDecimal interestRate,
            @DecimalMin("0.00") @DecimalMax("5.00") BigDecimal seniorCitizenBonusRate,
            @NotBlank String payoutFrequency,
            @NotNull LocalDate effectiveFrom,
            LocalDate effectiveTo
    ) {}

    public record RateSlabResponse(
            UUID id,
            Integer versionNumber,
            Integer minTenureDays,
            Integer maxTenureDays,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            BigDecimal interestRate,
            BigDecimal seniorCitizenBonusRate,
            String payoutFrequency,
            LocalDate effectiveFrom,
            LocalDate effectiveTo,
            boolean active
    ) {}

    public record CreateOrUpdateProductRequest(
            @NotBlank @Size(max = 50) String productCode,
            @NotBlank @Size(max = 150) String productName,
            @NotNull ProductType productType,
            @Size(max = 500) String shortDescription,
            String detailedDescription,
            @NotBlank @Size(min = 3, max = 3) String currency,
            @NotNull @DecimalMin("1.00") BigDecimal minAmount,
            @NotNull @DecimalMin("1.00") BigDecimal maxAmount,
            @NotNull @DecimalMin("1.00") BigDecimal denominationStep,
            @NotNull @Min(1) Integer minTenureMonths,
            @NotNull @Min(1) Integer maxTenureMonths,
            @NotNull @DecimalMin("0.01") BigDecimal baseRate,
            @NotNull @DecimalMin("0.01") BigDecimal maxRate,
            @NotBlank String compoundingFrequency,
            @NotBlank String payoutOptions,
            boolean prematureWithdrawalAllowed,
            @NotNull @DecimalMin("0.00") BigDecimal prematurePenaltyPct,
            @NotNull @Min(0) Integer lockInMonths,
            boolean loanAgainstFdAllowed,
            @NotNull @DecimalMin("0.00") @DecimalMax("95.00") BigDecimal maxLtvPct,
            boolean autoRenewalSupported,
            boolean returnsGuaranteed,
            boolean marketLinked,
            boolean governmentScheme,
            String fundCategory,
            String benchmarkIndex,
            String riskLevel,
            String eligibilityCriteria,
            String requiredDocuments,
            String benefits,
            String regulatoryDisclosures,
            String feeRules,
            List<RateSlabRequest> rateSlabs,
            String changeSummary
    ) {}

    public record UpdateProductStatusRequest(
            @NotNull ProductStatus status,
            @Size(max = 500) String remarks
    ) {}

    public record ProductResponse(
            UUID id,
            String productCode,
            String productName,
            ProductType productType,
            ProductStatus status,
            Integer activeVersion,
            String shortDescription,
            String detailedDescription,
            String currency,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            BigDecimal denominationStep,
            Integer minTenureMonths,
            Integer maxTenureMonths,
            BigDecimal baseRate,
            BigDecimal maxRate,
            String compoundingFrequency,
            String payoutOptions,
            boolean prematureWithdrawalAllowed,
            BigDecimal prematurePenaltyPct,
            Integer lockInMonths,
            boolean loanAgainstFdAllowed,
            BigDecimal maxLtvPct,
            boolean autoRenewalSupported,
            boolean returnsGuaranteed,
            boolean marketLinked,
            boolean governmentScheme,
            String fundCategory,
            String benchmarkIndex,
            String riskLevel,
            String eligibilityCriteria,
            String requiredDocuments,
            String benefits,
            String regulatoryDisclosures,
            String feeRules,
            List<RateSlabResponse> rateSlabs,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record ProductVersionResponse(
            UUID id,
            Integer versionNumber,
            Instant effectiveFrom,
            Instant effectiveTo,
            BigDecimal baseRate,
            BigDecimal maxRate,
            String changeSummary,
            String createdBy,
            Instant createdAt
    ) {}

    public record ProductAuditLogResponse(
            UUID id,
            UUID productId,
            String productCode,
            String action,
            String changedBy,
            String changedByRole,
            String remarks,
            String correlationId,
            Instant createdAt
    ) {}

    public record ProductPerformanceStats(
            String productCode,
            String productName,
            ProductType productType,
            ProductStatus status,
            long activeCount,
            BigDecimal totalActiveInvested
    ) {}
}
