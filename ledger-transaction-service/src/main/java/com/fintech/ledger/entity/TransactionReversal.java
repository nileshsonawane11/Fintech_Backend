package com.fintech.ledger.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transaction_reversals")
public class TransactionReversal {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "original_transaction_id", nullable = false, updatable = false)
    private LedgerTransaction originalTransaction;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reversal_transaction_id", nullable = false, unique = true, updatable = false)
    private LedgerTransaction reversalTransaction;

    @Column(name = "reason_code", nullable = false, length = 100, updatable = false)
    private String reasonCode;

    @Column(name = "remarks", length = 255, updatable = false)
    private String remarks;

    @Column(name = "reversed_by", length = 100, updatable = false)
    private String reversedBy;

    @Column(name = "reversed_at", nullable = false, updatable = false)
    private Instant reversedAt;

    public TransactionReversal() {
    }

    public TransactionReversal(UUID id, LedgerTransaction originalTransaction, LedgerTransaction reversalTransaction,
                               String reasonCode, String remarks, String reversedBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.originalTransaction = originalTransaction;
        this.reversalTransaction = reversalTransaction;
        this.reasonCode = reasonCode;
        this.remarks = remarks;
        this.reversedBy = reversedBy;
        this.reversedAt = Instant.now();
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (reversedAt == null) {
            reversedAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public LedgerTransaction getOriginalTransaction() {
        return originalTransaction;
    }

    public void setOriginalTransaction(LedgerTransaction originalTransaction) {
        this.originalTransaction = originalTransaction;
    }

    public LedgerTransaction getReversalTransaction() {
        return reversalTransaction;
    }

    public void setReversalTransaction(LedgerTransaction reversalTransaction) {
        this.reversalTransaction = reversalTransaction;
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

    public String getReversedBy() {
        return reversedBy;
    }

    public void setReversedBy(String reversedBy) {
        this.reversedBy = reversedBy;
    }

    public Instant getReversedAt() {
        return reversedAt;
    }

    public void setReversedAt(Instant reversedAt) {
        this.reversedAt = reversedAt;
    }
}
