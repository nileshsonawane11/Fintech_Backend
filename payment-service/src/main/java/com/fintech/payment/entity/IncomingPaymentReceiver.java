package com.fintech.payment.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "incoming_payment_receivers")
public class IncomingPaymentReceiver {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "receiver_id", nullable = false, unique = true, length = 50)
    private String receiverId;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "finbank_account_id", nullable = false, length = 50)
    private String finbankAccountId;

    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @Column(name = "provider_customer_id", length = 100)
    private String providerCustomerId;

    @Column(name = "provider_va_id", nullable = false, unique = true, length = 100)
    private String providerVaId;

    @Column(name = "va_status", nullable = false, length = 30)
    private String vaStatus = "ACTIVE";

    @Column(name = "virtual_account_number", length = 100)
    private String virtualAccountNumber;

    @Column(name = "virtual_ifsc", length = 30)
    private String virtualIfsc;

    @Column(name = "virtual_bank_name", length = 200)
    private String virtualBankName;

    @Column(name = "virtual_account_name", length = 200)
    private String virtualAccountName;

    @Column(name = "virtual_vpa", length = 150)
    private String virtualVpa;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "close_by")
    private Instant closeBy;

    @Column(name = "closed_at")
    private Instant closedAt;

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
    public String getReceiverId() { return receiverId; }
    public void setReceiverId(String receiverId) { this.receiverId = receiverId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getFinbankAccountId() { return finbankAccountId; }
    public void setFinbankAccountId(String finbankAccountId) { this.finbankAccountId = finbankAccountId; }
    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }
    public String getProviderCustomerId() { return providerCustomerId; }
    public void setProviderCustomerId(String providerCustomerId) { this.providerCustomerId = providerCustomerId; }
    public String getProviderVaId() { return providerVaId; }
    public void setProviderVaId(String providerVaId) { this.providerVaId = providerVaId; }
    public String getVaStatus() { return vaStatus; }
    public void setVaStatus(String vaStatus) { this.vaStatus = vaStatus; }
    public String getVirtualAccountNumber() { return virtualAccountNumber; }
    public void setVirtualAccountNumber(String virtualAccountNumber) { this.virtualAccountNumber = virtualAccountNumber; }
    public String getVirtualIfsc() { return virtualIfsc; }
    public void setVirtualIfsc(String virtualIfsc) { this.virtualIfsc = virtualIfsc; }
    public String getVirtualBankName() { return virtualBankName; }
    public void setVirtualBankName(String virtualBankName) { this.virtualBankName = virtualBankName; }
    public String getVirtualAccountName() { return virtualAccountName; }
    public void setVirtualAccountName(String virtualAccountName) { this.virtualAccountName = virtualAccountName; }
    public String getVirtualVpa() { return virtualVpa; }
    public void setVirtualVpa(String virtualVpa) { this.virtualVpa = virtualVpa; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Instant getCloseBy() { return closeBy; }
    public void setCloseBy(Instant closeBy) { this.closeBy = closeBy; }
    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
