package com.fintech.identity.model;

import com.fintech.identity.model.enums.ConsentPurpose;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "customer_consents",
        indexes = {
                @Index(name = "idx_consent_customer", columnList = "customer_id")
        }
)
public class Consent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ConsentPurpose purpose;

    @Column(name = "consent_text_version", nullable = false)
    private String consentTextVersion;

    @Column(name = "granted_at", nullable = false, updatable = false)
    private Instant grantedAt;

    protected Consent() {
    }

    public Consent(
            Customer customer,
            ConsentPurpose purpose,
            String consentTextVersion
    ) {
        this.customer = customer;
        this.purpose = purpose;
        this.consentTextVersion = consentTextVersion;
    }

    @PrePersist
    void onCreate() {
        grantedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Customer getCustomer() { return customer; }
    public ConsentPurpose getPurpose() { return purpose; }
    public String getConsentTextVersion() { return consentTextVersion; }
    public Instant getGrantedAt() { return grantedAt; }
}