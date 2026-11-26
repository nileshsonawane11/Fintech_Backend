package com.fintech.loan.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "loan_applications")
public class LoanApplication {

    @Id
    @Column(name = "id", nullable = false, length = 36)
    private String id = UUID.randomUUID().toString();

    @Column(name = "loan_application_id", nullable = false, length = 50, unique = true)
    private String loanApplicationId;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "identity_subject", length = 100)
    private String identitySubject;

    @Column(name = "customer_name", length = 200)
    private String customerName;

    @Column(name = "kyc_status", length = 30)
    private String kycStatus;

    @Column(name = "kyc_case_id", length = 50)
    private String kycCaseId;

    @Column(name = "product_code", nullable = false, length = 50)
    private String productCode;

    @Column(name = "requested_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "tenure_months", nullable = false)
    private Integer tenureMonths;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "purpose", length = 100)
    private String purpose;

    @Column(name = "credit_bureau_consent", nullable = false)
    private Boolean creditBureauConsent = true;

    @Column(name = "employment_type", length = 50)
    private String employmentType;

    @Column(name = "monthly_income", precision = 15, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(name = "existing_monthly_emis", nullable = false, precision = 15, scale = 2)
    private BigDecimal existingMonthlyEmis = BigDecimal.ZERO;

    @Column(name = "employer_name", length = 200)
    private String employerName;

    @Column(name = "disbursement_account_id", length = 100)
    private String disbursementAccountId;

    @Column(name = "disbursement_account_number", length = 100)
    private String disbursementAccountNumber;

    @Column(name = "indicative_emi", precision = 15, scale = 2)
    private BigDecimal indicativeEmi;

    @Column(name = "calculated_foir", precision = 5, scale = 2)
    private BigDecimal calculatedFoir;

    @Column(name = "base_interest_rate", precision = 5, scale = 2)
    private BigDecimal baseInterestRate;

    @Column(name = "effective_interest_rate", precision = 5, scale = 2)
    private BigDecimal effectiveInterestRate;

    @Column(name = "processing_fee_amount", precision = 15, scale = 2)
    private BigDecimal processingFeeAmount;

    @Column(name = "collateral_value", precision = 15, scale = 2)
    private BigDecimal collateralValue;

    @Column(name = "ltv_percentage", precision = 5, scale = 2)
    private BigDecimal ltvPercentage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "additional_details", columnDefinition = "jsonb")
    private Map<String, Object> additionalDetails = new LinkedHashMap<>();

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "credit_assessment_status", nullable = false, length = 50)
    private String creditAssessmentStatus;

    @Column(name = "estimated_decision_time")
    private Instant estimatedDecisionTime;

    @Column(name = "assigned_officer_id", length = 100)
    private String assignedOfficerId;

    @Column(name = "assigned_officer_name", length = 200)
    private String assignedOfficerName;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_amount", precision = 15, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "approved_tenure_months")
    private Integer approvedTenureMonths;

    @Column(name = "approved_interest_rate", precision = 5, scale = 2)
    private BigDecimal approvedInterestRate;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "disbursed_at")
    private Instant disbursedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public LoanApplication() {}

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (existingMonthlyEmis == null) {
            existingMonthlyEmis = BigDecimal.ZERO;
        }
        if (currency == null) {
            currency = "INR";
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getKycStatus() { return kycStatus; }
    public void setKycStatus(String kycStatus) { this.kycStatus = kycStatus; }

    public String getKycCaseId() { return kycCaseId; }
    public void setKycCaseId(String kycCaseId) { this.kycCaseId = kycCaseId; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }

    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public Boolean getCreditBureauConsent() { return creditBureauConsent; }
    public void setCreditBureauConsent(Boolean creditBureauConsent) { this.creditBureauConsent = creditBureauConsent; }

    public String getEmploymentType() { return employmentType; }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }

    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }

    public BigDecimal getExistingMonthlyEmis() { return existingMonthlyEmis; }
    public void setExistingMonthlyEmis(BigDecimal existingMonthlyEmis) { this.existingMonthlyEmis = existingMonthlyEmis; }

    public String getEmployerName() { return employerName; }
    public void setEmployerName(String employerName) { this.employerName = employerName; }

    public String getDisbursementAccountId() { return disbursementAccountId; }
    public void setDisbursementAccountId(String disbursementAccountId) { this.disbursementAccountId = disbursementAccountId; }

    public String getDisbursementAccountNumber() { return disbursementAccountNumber; }
    public void setDisbursementAccountNumber(String disbursementAccountNumber) { this.disbursementAccountNumber = disbursementAccountNumber; }

    public BigDecimal getIndicativeEmi() { return indicativeEmi; }
    public void setIndicativeEmi(BigDecimal indicativeEmi) { this.indicativeEmi = indicativeEmi; }

    public BigDecimal getCalculatedFoir() { return calculatedFoir; }
    public void setCalculatedFoir(BigDecimal calculatedFoir) { this.calculatedFoir = calculatedFoir; }

    public BigDecimal getBaseInterestRate() { return baseInterestRate; }
    public void setBaseInterestRate(BigDecimal baseInterestRate) { this.baseInterestRate = baseInterestRate; }

    public BigDecimal getEffectiveInterestRate() { return effectiveInterestRate; }
    public void setEffectiveInterestRate(BigDecimal effectiveInterestRate) { this.effectiveInterestRate = effectiveInterestRate; }

    public BigDecimal getProcessingFeeAmount() { return processingFeeAmount; }
    public void setProcessingFeeAmount(BigDecimal processingFeeAmount) { this.processingFeeAmount = processingFeeAmount; }

    public BigDecimal getCollateralValue() { return collateralValue; }
    public void setCollateralValue(BigDecimal collateralValue) { this.collateralValue = collateralValue; }

    public BigDecimal getLtvPercentage() { return ltvPercentage; }
    public void setLtvPercentage(BigDecimal ltvPercentage) { this.ltvPercentage = ltvPercentage; }

    public Map<String, Object> getAdditionalDetails() { return additionalDetails; }
    public void setAdditionalDetails(Map<String, Object> additionalDetails) {
        this.additionalDetails = additionalDetails != null ? new LinkedHashMap<>(additionalDetails) : new LinkedHashMap<>();
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreditAssessmentStatus() { return creditAssessmentStatus; }
    public void setCreditAssessmentStatus(String creditAssessmentStatus) { this.creditAssessmentStatus = creditAssessmentStatus; }

    public Instant getEstimatedDecisionTime() { return estimatedDecisionTime; }
    public void setEstimatedDecisionTime(Instant estimatedDecisionTime) { this.estimatedDecisionTime = estimatedDecisionTime; }

    public String getAssignedOfficerId() { return assignedOfficerId; }
    public void setAssignedOfficerId(String assignedOfficerId) { this.assignedOfficerId = assignedOfficerId; }

    public String getAssignedOfficerName() { return assignedOfficerName; }
    public void setAssignedOfficerName(String assignedOfficerName) { this.assignedOfficerName = assignedOfficerName; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public BigDecimal getApprovedAmount() { return approvedAmount; }
    public void setApprovedAmount(BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }

    public Integer getApprovedTenureMonths() { return approvedTenureMonths; }
    public void setApprovedTenureMonths(Integer approvedTenureMonths) { this.approvedTenureMonths = approvedTenureMonths; }

    public BigDecimal getApprovedInterestRate() { return approvedInterestRate; }
    public void setApprovedInterestRate(BigDecimal approvedInterestRate) { this.approvedInterestRate = approvedInterestRate; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getDisbursedAt() { return disbursedAt; }
    public void setDisbursedAt(Instant disbursedAt) { this.disbursedAt = disbursedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
