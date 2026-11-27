package com.fintech.investment.entity;

import com.fintech.investment.entity.InvestmentEnums.InvestmentStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "investments")
public class Investment {

    @Id
    private UUID id;

    @Column(name = "investment_id", nullable = false, unique = true, length = 50)
    private String investmentId;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private InvestmentStatus status = InvestmentStatus.ACTIVE;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "principal_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "monthly_amount", precision = 19, scale = 2)
    private BigDecimal monthlyAmount;

    @Column(name = "total_invested", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalInvested;

    @Column(name = "interest_rate", nullable = false, precision = 7, scale = 4)
    private BigDecimal interestRate;

    @Column(name = "rate_locked_at", nullable = false)
    private Instant rateLockedAt;

    @Column(name = "compounding_frequency", nullable = false, length = 20)
    private String compoundingFrequency;

    @Column(name = "payout_frequency", nullable = false, length = 20)
    private String payoutFrequency;

    @Column(name = "tenure_months", nullable = false)
    private Integer tenureMonths;

    @Column(name = "tenure_days", nullable = false)
    private Integer tenureDays;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "maturity_date", nullable = false)
    private LocalDate maturityDate;

    @Column(name = "maturity_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal maturityAmount;

    @Column(name = "accrued_interest", nullable = false, precision = 19, scale = 2)
    private BigDecimal accruedInterest = BigDecimal.ZERO;

    @Column(name = "projected_gain", nullable = false, precision = 19, scale = 2)
    private BigDecimal projectedGain = BigDecimal.ZERO;

    @Column(name = "funding_account_id", nullable = false, length = 80)
    private String fundingAccountId;

    @Column(name = "funding_account_masked", length = 40)
    private String fundingAccountMasked;

    @Column(name = "auto_renewal", nullable = false)
    private boolean autoRenewal = false;

    @Column(name = "maturity_instruction", nullable = false, length = 40)
    private String maturityInstruction = "CREDIT_TO_ACCOUNT";

    @Column(name = "loan_against_fd_active", nullable = false)
    private boolean loanAgainstFdActive = false;

    @Column(name = "lien_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal lienAmount = BigDecimal.ZERO;

    @Column(name = "sip_fund_category", length = 60)
    private String sipFundCategory;

    @Column(name = "sip_debit_day")
    private Integer sipDebitDay;

    @Column(name = "sip_mandate_ref", length = 80)
    private String sipMandateRef;

    @Column(name = "ssy_girl_child_name", length = 150)
    private String ssyGirlChildName;

    @Column(name = "ssy_girl_child_dob")
    private LocalDate ssyGirlChildDob;

    @Column(name = "ssy_guardian_name", length = 150)
    private String ssyGuardianName;

    @Column(name = "ssy_guardian_relationship", length = 50)
    private String ssyGuardianRelationship;

    @Column(name = "ssy_deposit_end_date")
    private LocalDate ssyDepositEndDate;

    @Column(name = "certificate_number", nullable = false, unique = true, length = 60)
    private String certificateNumber;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Version
    private Long version;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (rateLockedAt == null) rateLockedAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getInvestmentId() { return investmentId; }
    public void setInvestmentId(String investmentId) { this.investmentId = investmentId; }
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
    public InvestmentStatus getStatus() { return status; }
    public void setStatus(InvestmentStatus status) { this.status = status; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }
    public BigDecimal getMonthlyAmount() { return monthlyAmount; }
    public void setMonthlyAmount(BigDecimal monthlyAmount) { this.monthlyAmount = monthlyAmount; }
    public BigDecimal getTotalInvested() { return totalInvested; }
    public void setTotalInvested(BigDecimal totalInvested) { this.totalInvested = totalInvested; }
    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }
    public Instant getRateLockedAt() { return rateLockedAt; }
    public void setRateLockedAt(Instant rateLockedAt) { this.rateLockedAt = rateLockedAt; }
    public String getCompoundingFrequency() { return compoundingFrequency; }
    public void setCompoundingFrequency(String compoundingFrequency) { this.compoundingFrequency = compoundingFrequency; }
    public String getPayoutFrequency() { return payoutFrequency; }
    public void setPayoutFrequency(String payoutFrequency) { this.payoutFrequency = payoutFrequency; }
    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }
    public Integer getTenureDays() { return tenureDays; }
    public void setTenureDays(Integer tenureDays) { this.tenureDays = tenureDays; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getMaturityDate() { return maturityDate; }
    public void setMaturityDate(LocalDate maturityDate) { this.maturityDate = maturityDate; }
    public BigDecimal getMaturityAmount() { return maturityAmount; }
    public void setMaturityAmount(BigDecimal maturityAmount) { this.maturityAmount = maturityAmount; }
    public BigDecimal getAccruedInterest() { return accruedInterest; }
    public void setAccruedInterest(BigDecimal accruedInterest) { this.accruedInterest = accruedInterest; }
    public BigDecimal getProjectedGain() { return projectedGain; }
    public void setProjectedGain(BigDecimal projectedGain) { this.projectedGain = projectedGain; }
    public String getFundingAccountId() { return fundingAccountId; }
    public void setFundingAccountId(String fundingAccountId) { this.fundingAccountId = fundingAccountId; }
    public String getFundingAccountMasked() { return fundingAccountMasked; }
    public void setFundingAccountMasked(String fundingAccountMasked) { this.fundingAccountMasked = fundingAccountMasked; }
    public boolean isAutoRenewal() { return autoRenewal; }
    public void setAutoRenewal(boolean autoRenewal) { this.autoRenewal = autoRenewal; }
    public String getMaturityInstruction() { return maturityInstruction; }
    public void setMaturityInstruction(String maturityInstruction) { this.maturityInstruction = maturityInstruction; }
    public boolean isLoanAgainstFdActive() { return loanAgainstFdActive; }
    public void setLoanAgainstFdActive(boolean loanAgainstFdActive) { this.loanAgainstFdActive = loanAgainstFdActive; }
    public BigDecimal getLienAmount() { return lienAmount; }
    public void setLienAmount(BigDecimal lienAmount) { this.lienAmount = lienAmount; }
    public String getSipFundCategory() { return sipFundCategory; }
    public void setSipFundCategory(String sipFundCategory) { this.sipFundCategory = sipFundCategory; }
    public Integer getSipDebitDay() { return sipDebitDay; }
    public void setSipDebitDay(Integer sipDebitDay) { this.sipDebitDay = sipDebitDay; }
    public String getSipMandateRef() { return sipMandateRef; }
    public void setSipMandateRef(String sipMandateRef) { this.sipMandateRef = sipMandateRef; }
    public String getSsyGirlChildName() { return ssyGirlChildName; }
    public void setSsyGirlChildName(String ssyGirlChildName) { this.ssyGirlChildName = ssyGirlChildName; }
    public LocalDate getSsyGirlChildDob() { return ssyGirlChildDob; }
    public void setSsyGirlChildDob(LocalDate ssyGirlChildDob) { this.ssyGirlChildDob = ssyGirlChildDob; }
    public String getSsyGuardianName() { return ssyGuardianName; }
    public void setSsyGuardianName(String ssyGuardianName) { this.ssyGuardianName = ssyGuardianName; }
    public String getSsyGuardianRelationship() { return ssyGuardianRelationship; }
    public void setSsyGuardianRelationship(String ssyGuardianRelationship) { this.ssyGuardianRelationship = ssyGuardianRelationship; }
    public LocalDate getSsyDepositEndDate() { return ssyDepositEndDate; }
    public void setSsyDepositEndDate(LocalDate ssyDepositEndDate) { this.ssyDepositEndDate = ssyDepositEndDate; }
    public String getCertificateNumber() { return certificateNumber; }
    public void setCertificateNumber(String certificateNumber) { this.certificateNumber = certificateNumber; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
    public Long getVersion() { return version; }
}
