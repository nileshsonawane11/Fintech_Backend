package com.fintech.customer.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "customer_profiles")
public class CustomerProfile {

    @Id
    private UUID id;

    @Column(name = "customer_id", nullable = false, unique = true)
    private String customerId;

    @Column(name = "identity_subject", nullable = false, unique = true)
    private String identitySubject;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "mobile_masked")
    private String mobileMasked;

    @Column(name = "email_masked")
    private String emailMasked;

    @Column(name = "pan_masked")
    private String panMasked;

    @Column(name = "kyc_status", nullable = false)
    private String kycStatus = "NOT_STARTED";

    @Column(name = "risk_category", nullable = false)
    private String riskCategory = "UNASSESSED";

    @Column(name = "pan_encrypted")
    private String panEncrypted;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public CustomerProfile() {}

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();

        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public static CustomerProfile create(
            String customerId, String identitySubject) {
        CustomerProfile profile = new CustomerProfile();
        profile.id = UUID.randomUUID();
        profile.customerId = customerId;
        profile.identitySubject = identitySubject;
        profile.kycStatus = "NOT_STARTED";
        profile.riskCategory = "UNASSESSED";
        return profile;
    }

    public static String maskPan(String pan) {
        if (pan == null || pan.length() != 10) {
            return null;
        }
        return "*****" + pan.substring(5);
    }

    public UUID getId() { return id; }
    public String getCustomerId() { return customerId; }
    public String getIdentitySubject() { return identitySubject; }
    public String getFullName() { return fullName; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public String getMobileMasked() { return mobileMasked; }
    public String getEmailMasked() { return emailMasked; }
    public String getPanMasked() { return panMasked; }
    public String getKycStatus() { return kycStatus; }
    public String getRiskCategory() { return riskCategory; }
    public Instant getCreatedAt() { return createdAt; }
    public String getPanEncrypted() { return panEncrypted; }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setPanEncrypted(String panEncrypted) { this.panEncrypted = panEncrypted;}

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public void setIdentitySubject(String identitySubject) {
        this.identitySubject = identitySubject;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public void setMobileMasked(String mobileMasked) {
        this.mobileMasked = mobileMasked;
    }

    public void setEmailMasked(String emailMasked) {
        this.emailMasked = emailMasked;
    }

    public void setPanMasked(String panMasked) {
        this.panMasked = panMasked;
    }

    public void setKycStatus(String kycStatus) {
        this.kycStatus = kycStatus;
    }

    public void setRiskCategory(String riskCategory) {
        this.riskCategory = riskCategory;
    }
}