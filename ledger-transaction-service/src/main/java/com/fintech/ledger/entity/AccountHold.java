package com.fintech.ledger.entity;

import com.fintech.ledger.enums.HoldStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "account_holds")
public class AccountHold {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "hold_id", nullable = false, unique = true, length = 100)
    private String holdId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ledger_account_id", nullable = false)
    private LedgerAccount ledgerAccount;

    @Column(name = "bank_account_id")
    private UUID bankAccountId;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "reason_code", length = 100)
    private String reasonCode;

    @Column(name = "remarks", length = 255)
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(name = "hold_status", nullable = false, length = 30)
    private HoldStatus holdStatus;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "released_by", length = 100)
    private String releasedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "released_at")
    private Instant releasedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public AccountHold() {
    }

    public AccountHold(UUID id, String holdId, LedgerAccount ledgerAccount, UUID bankAccountId,
                       UUID customerId, BigDecimal amount, String currency, String reasonCode,
                       String remarks, String referenceNumber, String createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.holdId = holdId;
        this.ledgerAccount = ledgerAccount;
        this.bankAccountId = bankAccountId;
        this.customerId = customerId;
        this.amount = amount;
        this.currency = currency;
        this.reasonCode = reasonCode;
        this.remarks = remarks;
        this.referenceNumber = referenceNumber;
        this.createdBy = createdBy;
        this.holdStatus = HoldStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.version = 0L;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (holdStatus == null) {
            holdStatus = HoldStatus.ACTIVE;
        }
        if (version == null) {
            version = 0L;
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getHoldId() {
        return holdId;
    }

    public void setHoldId(String holdId) {
        this.holdId = holdId;
    }

    public LedgerAccount getLedgerAccount() {
        return ledgerAccount;
    }

    public void setLedgerAccount(LedgerAccount ledgerAccount) {
        this.ledgerAccount = ledgerAccount;
    }

    public UUID getBankAccountId() {
        return bankAccountId;
    }

    public void setBankAccountId(UUID bankAccountId) {
        this.bankAccountId = bankAccountId;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public void setCustomerId(UUID customerId) {
        this.customerId = customerId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public void setReasonCode(String reasonCode) {
        this.reasonCode = reasonCode;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public HoldStatus getHoldStatus() {
        return holdStatus;
    }

    public void setHoldStatus(HoldStatus holdStatus) {
        this.holdStatus = holdStatus;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getReleasedBy() {
        return releasedBy;
    }

    public void setReleasedBy(String releasedBy) {
        this.releasedBy = releasedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getReleasedAt() {
        return releasedAt;
    }

    public void setReleasedAt(Instant releasedAt) {
        this.releasedAt = releasedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
