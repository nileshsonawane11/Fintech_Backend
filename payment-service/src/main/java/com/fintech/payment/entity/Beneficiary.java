package com.fintech.payment.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "beneficiaries")
public class Beneficiary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "beneficiary_id", nullable = false, unique = true, length = 50)
    private String beneficiaryId;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "customer_id", length = 100)
    private String customerId;

    @Column(name = "beneficiary_type", nullable = false, length = 20)
    private String beneficiaryType = "BANK_ACCOUNT";

    @Column(name = "nickname", nullable = false, length = 100)
    private String nickname;

    @Column(name = "beneficiary_name", nullable = false, length = 200)
    private String beneficiaryName;

    @Column(name = "account_number", length = 128)
    private String accountNumber;

    @Column(name = "account_number_hash", length = 64)
    private String accountNumberHash;

    @Column(name = "ifsc_code", length = 20)
    private String ifscCode;

    @Column(name = "bank_name", length = 200)
    private String bankName;

    @Column(name = "account_type", length = 30)
    private String accountType;

    @Column(name = "vpa_encrypted", length = 256)
    private String vpaEncrypted;

    @Column(name = "vpa_masked", length = 100)
    private String vpaMasked;

    @Column(name = "vpa_hash", length = 64)
    private String vpaHash;

    @Column(name = "relationship", length = 100)
    private String relationship;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "verification_status", nullable = false, length = 30)
    private String verificationStatus;

    @Column(name = "validated_account_name", length = 200)
    private String validatedAccountName;

    @Column(name = "name_match_score", precision = 5, scale = 4)
    private BigDecimal nameMatchScore;

    @Column(name = "validation_provider_ref", length = 100)
    private String validationProviderRef;

    @Column(name = "validation_reason", length = 255)
    private String validationReason;

    @Column(name = "provider_contact_id", length = 100)
    private String providerContactId;

    @Column(name = "provider_fund_account_id", length = 100)
    private String providerFundAccountId;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "deactivated_at")
    private Instant deactivatedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(String beneficiaryId) { this.beneficiaryId = beneficiaryId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getBeneficiaryType() { return beneficiaryType; }
    public void setBeneficiaryType(String beneficiaryType) { this.beneficiaryType = beneficiaryType; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getBeneficiaryName() { return beneficiaryName; }
    public void setBeneficiaryName(String beneficiaryName) { this.beneficiaryName = beneficiaryName; }
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    public String getAccountNumberHash() { return accountNumberHash; }
    public void setAccountNumberHash(String accountNumberHash) { this.accountNumberHash = accountNumberHash; }
    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }
    public String getVpaEncrypted() { return vpaEncrypted; }
    public void setVpaEncrypted(String vpaEncrypted) { this.vpaEncrypted = vpaEncrypted; }
    public String getVpaMasked() { return vpaMasked; }
    public void setVpaMasked(String vpaMasked) { this.vpaMasked = vpaMasked; }
    public String getVpaHash() { return vpaHash; }
    public void setVpaHash(String vpaHash) { this.vpaHash = vpaHash; }
    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public String getValidatedAccountName() { return validatedAccountName; }
    public void setValidatedAccountName(String validatedAccountName) { this.validatedAccountName = validatedAccountName; }
    public BigDecimal getNameMatchScore() { return nameMatchScore; }
    public void setNameMatchScore(BigDecimal nameMatchScore) { this.nameMatchScore = nameMatchScore; }
    public String getValidationProviderRef() { return validationProviderRef; }
    public void setValidationProviderRef(String validationProviderRef) { this.validationProviderRef = validationProviderRef; }
    public String getValidationReason() { return validationReason; }
    public void setValidationReason(String validationReason) { this.validationReason = validationReason; }
    public String getProviderContactId() { return providerContactId; }
    public void setProviderContactId(String providerContactId) { this.providerContactId = providerContactId; }
    public String getProviderFundAccountId() { return providerFundAccountId; }
    public void setProviderFundAccountId(String providerFundAccountId) { this.providerFundAccountId = providerFundAccountId; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Instant verifiedAt) { this.verifiedAt = verifiedAt; }
    public Instant getDeactivatedAt() { return deactivatedAt; }
    public void setDeactivatedAt(Instant deactivatedAt) { this.deactivatedAt = deactivatedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
