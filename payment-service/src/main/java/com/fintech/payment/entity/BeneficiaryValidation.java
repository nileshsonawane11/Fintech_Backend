package com.fintech.payment.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "beneficiary_validations")
public class BeneficiaryValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "validation_id", nullable = false, unique = true, length = 50)
    private String validationId;

    @Column(name = "beneficiary_id", nullable = false, length = 50)
    private String beneficiaryId;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @Column(name = "provider_contact_id", length = 100)
    private String providerContactId;

    @Column(name = "provider_fund_account_id", length = 100)
    private String providerFundAccountId;

    @Column(name = "provider_validation_id", unique = true, length = 100)
    private String providerValidationId;

    @Column(name = "validation_mode", nullable = false, length = 30)
    private String validationMode;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "provider_account_status", length = 50)
    private String providerAccountStatus;

    @Column(name = "registered_name", length = 200)
    private String registeredName;

    @Column(name = "name_match_score", precision = 5, scale = 4)
    private BigDecimal nameMatchScore;

    @Column(name = "utr", length = 100)
    private String utr;

    @Column(name = "failure_source", length = 50)
    private String failureSource;

    @Column(name = "failure_reason", length = 100)
    private String failureReason;

    @Column(name = "failure_description", length = 500)
    private String failureDescription;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (initiatedAt == null) initiatedAt = now;
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getValidationId() { return validationId; }
    public void setValidationId(String validationId) { this.validationId = validationId; }
    public String getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(String beneficiaryId) { this.beneficiaryId = beneficiaryId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }
    public String getProviderContactId() { return providerContactId; }
    public void setProviderContactId(String providerContactId) { this.providerContactId = providerContactId; }
    public String getProviderFundAccountId() { return providerFundAccountId; }
    public void setProviderFundAccountId(String providerFundAccountId) { this.providerFundAccountId = providerFundAccountId; }
    public String getProviderValidationId() { return providerValidationId; }
    public void setProviderValidationId(String providerValidationId) { this.providerValidationId = providerValidationId; }
    public String getValidationMode() { return validationMode; }
    public void setValidationMode(String validationMode) { this.validationMode = validationMode; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getProviderAccountStatus() { return providerAccountStatus; }
    public void setProviderAccountStatus(String providerAccountStatus) { this.providerAccountStatus = providerAccountStatus; }
    public String getRegisteredName() { return registeredName; }
    public void setRegisteredName(String registeredName) { this.registeredName = registeredName; }
    public BigDecimal getNameMatchScore() { return nameMatchScore; }
    public void setNameMatchScore(BigDecimal nameMatchScore) { this.nameMatchScore = nameMatchScore; }
    public String getUtr() { return utr; }
    public void setUtr(String utr) { this.utr = utr; }
    public String getFailureSource() { return failureSource; }
    public void setFailureSource(String failureSource) { this.failureSource = failureSource; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public String getFailureDescription() { return failureDescription; }
    public void setFailureDescription(String failureDescription) { this.failureDescription = failureDescription; }
    public Instant getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(Instant initiatedAt) { this.initiatedAt = initiatedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
