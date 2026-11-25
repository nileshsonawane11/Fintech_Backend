package com.fintech.payment.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "provider_fund_accounts")
public class ProviderFundAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @Column(name = "beneficiary_id", nullable = false, length = 50)
    private String beneficiaryId;

    @Column(name = "provider_contact_id", nullable = false, length = 100)
    private String providerContactId;

    @Column(name = "provider_fund_account_id", nullable = false, unique = true, length = 100)
    private String providerFundAccountId;

    @Column(name = "account_type", nullable = false, length = 30)
    private String accountType;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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
    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }
    public String getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(String beneficiaryId) { this.beneficiaryId = beneficiaryId; }
    public String getProviderContactId() { return providerContactId; }
    public void setProviderContactId(String providerContactId) { this.providerContactId = providerContactId; }
    public String getProviderFundAccountId() { return providerFundAccountId; }
    public void setProviderFundAccountId(String providerFundAccountId) { this.providerFundAccountId = providerFundAccountId; }
    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
