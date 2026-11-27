package com.fintech.investment.entity;

import com.fintech.investment.entity.InvestmentEnums.ProductStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "investment_products")
public class InvestmentProduct {

    @Id
    private UUID id;

    @Column(name = "product_code", nullable = false, unique = true, length = 50)
    private String productCode;

    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false, length = 20)
    private ProductType productType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ProductStatus status = ProductStatus.DRAFT;

    @Column(name = "active_version", nullable = false)
    private Integer activeVersion = 1;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "detailed_description", columnDefinition = "TEXT")
    private String detailedDescription;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "min_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "max_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "denomination_step", nullable = false, precision = 19, scale = 2)
    private BigDecimal denominationStep = BigDecimal.ONE;

    @Column(name = "min_tenure_months", nullable = false)
    private Integer minTenureMonths;

    @Column(name = "max_tenure_months", nullable = false)
    private Integer maxTenureMonths;

    @Column(name = "base_rate", nullable = false, precision = 7, scale = 4)
    private BigDecimal baseRate;

    @Column(name = "max_rate", nullable = false, precision = 7, scale = 4)
    private BigDecimal maxRate;

    @Column(name = "compounding_frequency", nullable = false, length = 20)
    private String compoundingFrequency = "QUARTERLY";

    @Column(name = "payout_options", nullable = false, length = 150)
    private String payoutOptions = "MATURITY";

    @Column(name = "premature_withdrawal_allowed", nullable = false)
    private boolean prematureWithdrawalAllowed = true;

    @Column(name = "premature_penalty_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal prematurePenaltyPct = BigDecimal.ONE;

    @Column(name = "lock_in_months", nullable = false)
    private Integer lockInMonths = 0;

    @Column(name = "loan_against_fd_allowed", nullable = false)
    private boolean loanAgainstFdAllowed = false;

    @Column(name = "max_ltv_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxLtvPct = BigDecimal.ZERO;

    @Column(name = "auto_renewal_supported", nullable = false)
    private boolean autoRenewalSupported = false;

    @Column(name = "returns_guaranteed", nullable = false)
    private boolean returnsGuaranteed = true;

    @Column(name = "market_linked", nullable = false)
    private boolean marketLinked = false;

    @Column(name = "government_scheme", nullable = false)
    private boolean governmentScheme = false;

    @Column(name = "fund_category", length = 60)
    private String fundCategory;

    @Column(name = "benchmark_index", length = 100)
    private String benchmarkIndex;

    @Column(name = "risk_level", length = 30)
    private String riskLevel;

    @Column(name = "eligibility_criteria", columnDefinition = "TEXT")
    private String eligibilityCriteria;

    @Column(name = "required_documents", columnDefinition = "TEXT")
    private String requiredDocuments;

    @Column(name = "benefits", columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "regulatory_disclosures", columnDefinition = "TEXT")
    private String regulatoryDisclosures;

    @Column(name = "fee_rules", columnDefinition = "TEXT")
    private String feeRules;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public ProductType getProductType() { return productType; }
    public void setProductType(ProductType productType) { this.productType = productType; }
    public ProductStatus getStatus() { return status; }
    public void setStatus(ProductStatus status) { this.status = status; }
    public Integer getActiveVersion() { return activeVersion; }
    public void setActiveVersion(Integer activeVersion) { this.activeVersion = activeVersion; }
    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }
    public String getDetailedDescription() { return detailedDescription; }
    public void setDetailedDescription(String detailedDescription) { this.detailedDescription = detailedDescription; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getMinAmount() { return minAmount; }
    public void setMinAmount(BigDecimal minAmount) { this.minAmount = minAmount; }
    public BigDecimal getMaxAmount() { return maxAmount; }
    public void setMaxAmount(BigDecimal maxAmount) { this.maxAmount = maxAmount; }
    public BigDecimal getDenominationStep() { return denominationStep; }
    public void setDenominationStep(BigDecimal denominationStep) { this.denominationStep = denominationStep; }
    public Integer getMinTenureMonths() { return minTenureMonths; }
    public void setMinTenureMonths(Integer minTenureMonths) { this.minTenureMonths = minTenureMonths; }
    public Integer getMaxTenureMonths() { return maxTenureMonths; }
    public void setMaxTenureMonths(Integer maxTenureMonths) { this.maxTenureMonths = maxTenureMonths; }
    public BigDecimal getBaseRate() { return baseRate; }
    public void setBaseRate(BigDecimal baseRate) { this.baseRate = baseRate; }
    public BigDecimal getMaxRate() { return maxRate; }
    public void setMaxRate(BigDecimal maxRate) { this.maxRate = maxRate; }
    public String getCompoundingFrequency() { return compoundingFrequency; }
    public void setCompoundingFrequency(String compoundingFrequency) { this.compoundingFrequency = compoundingFrequency; }
    public String getPayoutOptions() { return payoutOptions; }
    public void setPayoutOptions(String payoutOptions) { this.payoutOptions = payoutOptions; }
    public boolean isPrematureWithdrawalAllowed() { return prematureWithdrawalAllowed; }
    public void setPrematureWithdrawalAllowed(boolean prematureWithdrawalAllowed) { this.prematureWithdrawalAllowed = prematureWithdrawalAllowed; }
    public BigDecimal getPrematurePenaltyPct() { return prematurePenaltyPct; }
    public void setPrematurePenaltyPct(BigDecimal prematurePenaltyPct) { this.prematurePenaltyPct = prematurePenaltyPct; }
    public Integer getLockInMonths() { return lockInMonths; }
    public void setLockInMonths(Integer lockInMonths) { this.lockInMonths = lockInMonths; }
    public boolean isLoanAgainstFdAllowed() { return loanAgainstFdAllowed; }
    public void setLoanAgainstFdAllowed(boolean loanAgainstFdAllowed) { this.loanAgainstFdAllowed = loanAgainstFdAllowed; }
    public BigDecimal getMaxLtvPct() { return maxLtvPct; }
    public void setMaxLtvPct(BigDecimal maxLtvPct) { this.maxLtvPct = maxLtvPct; }
    public boolean isAutoRenewalSupported() { return autoRenewalSupported; }
    public void setAutoRenewalSupported(boolean autoRenewalSupported) { this.autoRenewalSupported = autoRenewalSupported; }
    public boolean isReturnsGuaranteed() { return returnsGuaranteed; }
    public void setReturnsGuaranteed(boolean returnsGuaranteed) { this.returnsGuaranteed = returnsGuaranteed; }
    public boolean isMarketLinked() { return marketLinked; }
    public void setMarketLinked(boolean marketLinked) { this.marketLinked = marketLinked; }
    public boolean isGovernmentScheme() { return governmentScheme; }
    public void setGovernmentScheme(boolean governmentScheme) { this.governmentScheme = governmentScheme; }
    public String getFundCategory() { return fundCategory; }
    public void setFundCategory(String fundCategory) { this.fundCategory = fundCategory; }
    public String getBenchmarkIndex() { return benchmarkIndex; }
    public void setBenchmarkIndex(String benchmarkIndex) { this.benchmarkIndex = benchmarkIndex; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public String getEligibilityCriteria() { return eligibilityCriteria; }
    public void setEligibilityCriteria(String eligibilityCriteria) { this.eligibilityCriteria = eligibilityCriteria; }
    public String getRequiredDocuments() { return requiredDocuments; }
    public void setRequiredDocuments(String requiredDocuments) { this.requiredDocuments = requiredDocuments; }
    public String getBenefits() { return benefits; }
    public void setBenefits(String benefits) { this.benefits = benefits; }
    public String getRegulatoryDisclosures() { return regulatoryDisclosures; }
    public void setRegulatoryDisclosures(String regulatoryDisclosures) { this.regulatoryDisclosures = regulatoryDisclosures; }
    public String getFeeRules() { return feeRules; }
    public void setFeeRules(String feeRules) { this.feeRules = feeRules; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
