package com.fintech.ledger.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ledger_balance_snapshots")
public class LedgerBalanceSnapshot {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ledger_account_id", nullable = false, unique = true)
    private LedgerAccount ledgerAccount;

    @Column(name = "debit_total", nullable = false, precision = 19, scale = 4)
    private BigDecimal debitTotal = BigDecimal.ZERO;

    @Column(name = "credit_total", nullable = false, precision = 19, scale = 4)
    private BigDecimal creditTotal = BigDecimal.ZERO;

    @Column(name = "ledger_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal ledgerBalance = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "last_entry_id")
    private UUID lastEntryId;

    @Column(name = "last_posted_at")
    private Instant lastPostedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public LedgerBalanceSnapshot() {
    }

    public LedgerBalanceSnapshot(UUID id, LedgerAccount ledgerAccount, BigDecimal debitTotal,
                                 BigDecimal creditTotal, BigDecimal ledgerBalance, String currency) {
        this.id = id != null ? id : UUID.randomUUID();
        this.ledgerAccount = ledgerAccount;
        this.debitTotal = debitTotal != null ? debitTotal : BigDecimal.ZERO;
        this.creditTotal = creditTotal != null ? creditTotal : BigDecimal.ZERO;
        this.ledgerBalance = ledgerBalance != null ? ledgerBalance : BigDecimal.ZERO;
        this.currency = currency;
        this.updatedAt = Instant.now();
        this.version = 0L;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
        if (version == null) {
            version = 0L;
        }
        if (debitTotal == null) {
            debitTotal = BigDecimal.ZERO;
        }
        if (creditTotal == null) {
            creditTotal = BigDecimal.ZERO;
        }
        if (ledgerBalance == null) {
            ledgerBalance = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public LedgerAccount getLedgerAccount() {
        return ledgerAccount;
    }

    public void setLedgerAccount(LedgerAccount ledgerAccount) {
        this.ledgerAccount = ledgerAccount;
    }

    public BigDecimal getDebitTotal() {
        return debitTotal;
    }

    public void setDebitTotal(BigDecimal debitTotal) {
        this.debitTotal = debitTotal;
    }

    public BigDecimal getCreditTotal() {
        return creditTotal;
    }

    public void setCreditTotal(BigDecimal creditTotal) {
        this.creditTotal = creditTotal;
    }

    public BigDecimal getLedgerBalance() {
        return ledgerBalance;
    }

    public void setLedgerBalance(BigDecimal ledgerBalance) {
        this.ledgerBalance = ledgerBalance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public UUID getLastEntryId() {
        return lastEntryId;
    }

    public void setLastEntryId(UUID lastEntryId) {
        this.lastEntryId = lastEntryId;
    }

    public Instant getLastPostedAt() {
        return lastPostedAt;
    }

    public void setLastPostedAt(Instant lastPostedAt) {
        this.lastPostedAt = lastPostedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
