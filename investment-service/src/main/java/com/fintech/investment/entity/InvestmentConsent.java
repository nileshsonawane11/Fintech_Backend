package com.fintech.investment.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "investment_consents")
public class InvestmentConsent {

    @Id
    private UUID id;

    @Column(name = "application_id", nullable = false, length = 50)
    private String applicationId;

    @Column(name = "identity_subject", nullable = false, length = 100)
    private String identitySubject;

    @Column(name = "consent_type", nullable = false, length = 60)
    private String consentType;

    @Column(name = "disclosure_version", nullable = false, length = 30)
    private String disclosureVersion;

    @Column(name = "accepted", nullable = false)
    private boolean accepted;

    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;

    @Column(name = "client_device_id", length = 100)
    private String clientDeviceId;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (acceptedAt == null) acceptedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getApplicationId() { return applicationId; }
    public void setApplicationId(String applicationId) { this.applicationId = applicationId; }
    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }
    public String getConsentType() { return consentType; }
    public void setConsentType(String consentType) { this.consentType = consentType; }
    public String getDisclosureVersion() { return disclosureVersion; }
    public void setDisclosureVersion(String disclosureVersion) { this.disclosureVersion = disclosureVersion; }
    public boolean isAccepted() { return accepted; }
    public void setAccepted(boolean accepted) { this.accepted = accepted; }
    public Instant getAcceptedAt() { return acceptedAt; }
    public String getClientDeviceId() { return clientDeviceId; }
    public void setClientDeviceId(String clientDeviceId) { this.clientDeviceId = clientDeviceId; }
}
