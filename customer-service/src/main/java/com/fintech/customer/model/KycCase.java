package com.fintech.customer.model;

import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.kyc.state.KycStatus;
import com.fintech.customer.model.kyc.state.RiskCategory;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "kyc_cases")
public class KycCase {

    @Id
    private UUID id;

    @Column(name = "kyc_case_id", nullable = false, unique = true)
    private String kycCaseId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_profile_id", nullable = false)
    private CustomerProfile customerProfile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KycStatus status = KycStatus.SUBMITTED;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_category", nullable = false)
    private RiskCategory riskCategory = RiskCategory.UNASSESSED;

    private String gender;
    private String occupation;

    @Column(name = "annual_income_range")
    private String annualIncomeRange;

    @Column(name = "ckyc_number_encrypted")
    private String ckycNumberEncrypted;

    @Column(name = "aadhaar_consent", nullable = false)
    private boolean aadhaarConsent;

    @Column(name = "consent_recorded_at")
    private Instant consentRecordedAt;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected KycCase() {}

    public static KycCase submitted(
            String caseId,
            CustomerProfile customer,
            String gender,
            String occupation,
            String incomeRange,
            String encryptedCkycNumber,
            boolean consent) {

        KycCase kyc = new KycCase();
        kyc.id = UUID.randomUUID();
        kyc.kycCaseId = caseId;
        kyc.customerProfile = customer;
        kyc.gender = gender;
        kyc.occupation = occupation;
        kyc.annualIncomeRange = incomeRange;
        kyc.ckycNumberEncrypted = encryptedCkycNumber;
        kyc.aadhaarConsent = consent;

        Instant now = Instant.now();
        kyc.submittedAt = now;
        kyc.createdAt = now;
        kyc.updatedAt = now;

        if (consent) {
            kyc.consentRecordedAt = now;
        }

        return kyc;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getKycCaseId() { return kycCaseId; }
    public CustomerProfile getCustomerProfile() { return customerProfile; }
    public KycStatus getStatus() { return status; }
    public RiskCategory getRiskCategory() { return riskCategory; }
    public Instant getSubmittedAt() { return submittedAt; }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public void setCustomerProfile(CustomerProfile customerProfile) {
        this.customerProfile = customerProfile;
    }

    public String getOccupation() {
        return occupation;
    }

    public void setOccupation(String occupation) {
        this.occupation = occupation;
    }

    public String getAnnualIncomeRange() {
        return annualIncomeRange;
    }

    public void setAnnualIncomeRange(String annualIncomeRange) {
        this.annualIncomeRange = annualIncomeRange;
    }

    public String getCkycNumberEncrypted() {
        return ckycNumberEncrypted;
    }

    public void setCkycNumberEncrypted(String ckycNumberEncrypted) {
        this.ckycNumberEncrypted = ckycNumberEncrypted;
    }

    public boolean isAadhaarConsent() {
        return aadhaarConsent;
    }

    public void setAadhaarConsent(boolean aadhaarConsent) {
        this.aadhaarConsent = aadhaarConsent;
    }

    public Instant getConsentRecordedAt() {
        return consentRecordedAt;
    }

    public void setConsentRecordedAt(Instant consentRecordedAt) {
        this.consentRecordedAt = consentRecordedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }

    public void setStatus(KycStatus status) {
        this.status = status;
    }

    public void setRiskCategory(RiskCategory riskCategory) {
        this.riskCategory = riskCategory;
    }

    public void setSubmittedStatus() {
        this.status = KycStatus.SUBMITTED;
    }
}