package com.fintech.investment.entity;

import com.fintech.investment.entity.InvestmentEnums.ApplicationStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "investment_applications")
public class InvestmentApplication {

    @Id
    private UUID id;

    @Column(name = "application_id", nullable = false, unique = true, length = 50)
    private String applicationId;

    @Column(name = "identity_subject", nullable = false, length = 100)
    private String identitySubject;

    @Column(name = "customer_id", length = 50)
    private String customerId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "product_code", nullable = false, length = 50)
    private String productCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false, length = 20)
    private ProductType productType;

    @Column(name = "product_version", nullable = false)
    private Integer productVersion = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ApplicationStatus status = ApplicationStatus.SUBMITTED;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "requested_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "monthly_amount", precision = 19, scale = 2)
    private BigDecimal monthlyAmount;

    @Column(name = "tenure_months", nullable = false)
    private Integer tenureMonths;

    @Column(name = "tenure_days", nullable = false)
    private Integer tenureDays;

    @Column(name = "applied_rate", nullable = false, precision = 7, scale = 4)
    private BigDecimal appliedRate;

    @Column(name = "projected_maturity_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal projectedMaturityAmount;

    @Column(name = "projected_interest", nullable = false, precision = 19, scale = 2)
    private BigDecimal projectedInterest;

    @Column(name = "compounding_frequency", nullable = false, length = 20)
    private String compoundingFrequency;

    @Column(name = "payout_frequency", nullable = false, length = 20)
    private String payoutFrequency;

    @Column(name = "auto_renewal", nullable = false)
    private boolean autoRenewal = false;

    @Column(name = "funding_account_id", nullable = false, length = 80)
    private String fundingAccountId;

    @Column(name = "funding_account_masked", length = 40)
    private String fundingAccountMasked;

    @Column(name = "nominee_name", length = 150)
    private String nomineeName;

    @Column(name = "nominee_relationship", length = 50)
    private String nomineeRelationship;

    @Column(name = "nominee_dob")
    private LocalDate nomineeDob;

    @Column(name = "sip_fund_category", length = 60)
    private String sipFundCategory;

    @Column(name = "sip_debit_day")
    private Integer sipDebitDay;

    @Column(name = "ssy_girl_child_name", length = 150)
    private String ssyGirlChildName;

    @Column(name = "ssy_girl_child_dob")
    private LocalDate ssyGirlChildDob;

    @Column(name = "ssy_guardian_name", length = 150)
    private String ssyGuardianName;

    @Column(name = "ssy_guardian_relationship", length = 50)
    private String ssyGuardianRelationship;

    @Column(name = "ssy_family_exception", nullable = false)
    private boolean ssyFamilyException = false;

    @Column(name = "kyc_status_at_apply", length = 30)
    private String kycStatusAtApply;

    @Column(name = "eligibility_summary", columnDefinition = "TEXT")
    private String eligibilitySummary;

    @Column(name = "remarks", length = 500)
    private String remarks;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

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
    public String getApplicationId() { return applicationId; }
    public void setApplicationId(String applicationId) { this.applicationId = applicationId; }
    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }
    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }
    public ProductType getProductType() { return productType; }
    public void setProductType(ProductType productType) { this.productType = productType; }
    public Integer getProductVersion() { return productVersion; }
    public void setProductVersion(Integer productVersion) { this.productVersion = productVersion; }
    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus status) { this.status = status; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }
    public BigDecimal getMonthlyAmount() { return monthlyAmount; }
    public void setMonthlyAmount(BigDecimal monthlyAmount) { this.monthlyAmount = monthlyAmount; }
    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }
    public Integer getTenureDays() { return tenureDays; }
    public void setTenureDays(Integer tenureDays) { this.tenureDays = tenureDays; }
    public BigDecimal getAppliedRate() { return appliedRate; }
    public void setAppliedRate(BigDecimal appliedRate) { this.appliedRate = appliedRate; }
    public BigDecimal getProjectedMaturityAmount() { return projectedMaturityAmount; }
    public void setProjectedMaturityAmount(BigDecimal projectedMaturityAmount) { this.projectedMaturityAmount = projectedMaturityAmount; }
    public BigDecimal getProjectedInterest() { return projectedInterest; }
    public void setProjectedInterest(BigDecimal projectedInterest) { this.projectedInterest = projectedInterest; }
    public String getCompoundingFrequency() { return compoundingFrequency; }
    public void setCompoundingFrequency(String compoundingFrequency) { this.compoundingFrequency = compoundingFrequency; }
    public String getPayoutFrequency() { return payoutFrequency; }
    public void setPayoutFrequency(String payoutFrequency) { this.payoutFrequency = payoutFrequency; }
    public boolean isAutoRenewal() { return autoRenewal; }
    public void setAutoRenewal(boolean autoRenewal) { this.autoRenewal = autoRenewal; }
    public String getFundingAccountId() { return fundingAccountId; }
    public void setFundingAccountId(String fundingAccountId) { this.fundingAccountId = fundingAccountId; }
    public String getFundingAccountMasked() { return fundingAccountMasked; }
    public void setFundingAccountMasked(String fundingAccountMasked) { this.fundingAccountMasked = fundingAccountMasked; }
    public String getNomineeName() { return nomineeName; }
    public void setNomineeName(String nomineeName) { this.nomineeName = nomineeName; }
    public String getNomineeRelationship() { return nomineeRelationship; }
    public void setNomineeRelationship(String nomineeRelationship) { this.nomineeRelationship = nomineeRelationship; }
    public LocalDate getNomineeDob() { return nomineeDob; }
    public void setNomineeDob(LocalDate nomineeDob) { this.nomineeDob = nomineeDob; }
    public String getSipFundCategory() { return sipFundCategory; }
    public void setSipFundCategory(String sipFundCategory) { this.sipFundCategory = sipFundCategory; }
    public Integer getSipDebitDay() { return sipDebitDay; }
    public void setSipDebitDay(Integer sipDebitDay) { this.sipDebitDay = sipDebitDay; }
    public String getSsyGirlChildName() { return ssyGirlChildName; }
    public void setSsyGirlChildName(String ssyGirlChildName) { this.ssyGirlChildName = ssyGirlChildName; }
    public LocalDate getSsyGirlChildDob() { return ssyGirlChildDob; }
    public void setSsyGirlChildDob(LocalDate ssyGirlChildDob) { this.ssyGirlChildDob = ssyGirlChildDob; }
    public String getSsyGuardianName() { return ssyGuardianName; }
    public void setSsyGuardianName(String ssyGuardianName) { this.ssyGuardianName = ssyGuardianName; }
    public String getSsyGuardianRelationship() { return ssyGuardianRelationship; }
    public void setSsyGuardianRelationship(String ssyGuardianRelationship) { this.ssyGuardianRelationship = ssyGuardianRelationship; }
    public boolean isSsyFamilyException() { return ssyFamilyException; }
    public void setSsyFamilyException(boolean ssyFamilyException) { this.ssyFamilyException = ssyFamilyException; }
    public String getKycStatusAtApply() { return kycStatusAtApply; }
    public void setKycStatusAtApply(String kycStatusAtApply) { this.kycStatusAtApply = kycStatusAtApply; }
    public String getEligibilitySummary() { return eligibilitySummary; }
    public void setEligibilitySummary(String eligibilitySummary) { this.eligibilitySummary = eligibilitySummary; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
