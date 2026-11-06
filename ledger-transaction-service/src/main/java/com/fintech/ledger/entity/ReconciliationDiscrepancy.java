package com.fintech.ledger.entity;

import com.fintech.ledger.enums.DiscrepancyStatus;
import com.fintech.ledger.enums.DiscrepancyType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reconciliation_discrepancies")
public class ReconciliationDiscrepancy {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciliation_run_id", nullable = false)
    private ReconciliationRun reconciliationRun;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ledger_account_id", nullable = false)
    private LedgerAccount ledgerAccount;

    @Enumerated(EnumType.STRING)
    @Column(name = "discrepancy_type", nullable = false, length = 50)
    private DiscrepancyType discrepancyType;

    @Column(name = "expected_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal expectedAmount;

    @Column(name = "actual_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal actualAmount;

    @Column(name = "difference_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal differenceAmount;

    @Column(name = "description", length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DiscrepancyStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    public ReconciliationDiscrepancy() {
    }

    public ReconciliationDiscrepancy(UUID id, ReconciliationRun reconciliationRun, LedgerAccount ledgerAccount,
                                     DiscrepancyType discrepancyType, BigDecimal expectedAmount,
                                     BigDecimal actualAmount, BigDecimal differenceAmount, String description) {
        this.id = id != null ? id : UUID.randomUUID();
        this.reconciliationRun = reconciliationRun;
        this.ledgerAccount = ledgerAccount;
        this.discrepancyType = discrepancyType;
        this.expectedAmount = expectedAmount;
        this.actualAmount = actualAmount;
        this.differenceAmount = differenceAmount;
        this.description = description;
        this.status = DiscrepancyStatus.DETECTED;
        this.createdAt = Instant.now();
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = DiscrepancyStatus.DETECTED;
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public ReconciliationRun getReconciliationRun() {
        return reconciliationRun;
    }

    public void setReconciliationRun(ReconciliationRun reconciliationRun) {
        this.reconciliationRun = reconciliationRun;
    }

    public LedgerAccount getLedgerAccount() {
        return ledgerAccount;
    }

    public void setLedgerAccount(LedgerAccount ledgerAccount) {
        this.ledgerAccount = ledgerAccount;
    }

    public DiscrepancyType getDiscrepancyType() {
        return discrepancyType;
    }

    public void setDiscrepancyType(DiscrepancyType discrepancyType) {
        this.discrepancyType = discrepancyType;
    }

    public BigDecimal getExpectedAmount() {
        return expectedAmount;
    }

    public void setExpectedAmount(BigDecimal expectedAmount) {
        this.expectedAmount = expectedAmount;
    }

    public BigDecimal getActualAmount() {
        return actualAmount;
    }

    public void setActualAmount(BigDecimal actualAmount) {
        this.actualAmount = actualAmount;
    }

    public BigDecimal getDifferenceAmount() {
        return differenceAmount;
    }

    public void setDifferenceAmount(BigDecimal differenceAmount) {
        this.differenceAmount = differenceAmount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public DiscrepancyStatus getStatus() {
        return status;
    }

    public void setStatus(DiscrepancyStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public String getResolvedBy() {
        return resolvedBy;
    }

    public void setResolvedBy(String resolvedBy) {
        this.resolvedBy = resolvedBy;
    }
}
