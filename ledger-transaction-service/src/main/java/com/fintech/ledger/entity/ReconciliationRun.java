package com.fintech.ledger.entity;

import com.fintech.ledger.enums.ReconciliationStatus;
import com.fintech.ledger.enums.ReconciliationType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reconciliation_runs")
public class ReconciliationRun {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "reconciliation_id", nullable = false, unique = true, length = 100)
    private String reconciliationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_type", nullable = false, length = 50)
    private ReconciliationType reconciliationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ReconciliationStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "total_accounts", nullable = false)
    private Integer totalAccounts = 0;

    @Column(name = "matched_accounts", nullable = false)
    private Integer matchedAccounts = 0;

    @Column(name = "mismatched_accounts", nullable = false)
    private Integer mismatchedAccounts = 0;

    @Column(name = "difference_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal differenceAmount = BigDecimal.ZERO;

    @Column(name = "initiated_by", length = 100)
    private String initiatedBy;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    public ReconciliationRun() {
    }

    public ReconciliationRun(UUID id, String reconciliationId, ReconciliationType reconciliationType, String initiatedBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.reconciliationId = reconciliationId;
        this.reconciliationType = reconciliationType;
        this.initiatedBy = initiatedBy;
        this.status = ReconciliationStatus.PENDING;
        this.startedAt = Instant.now();
        this.totalAccounts = 0;
        this.matchedAccounts = 0;
        this.mismatchedAccounts = 0;
        this.differenceAmount = BigDecimal.ZERO;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (startedAt == null) {
            startedAt = Instant.now();
        }
        if (status == null) {
            status = ReconciliationStatus.PENDING;
        }
        if (totalAccounts == null) {
            totalAccounts = 0;
        }
        if (matchedAccounts == null) {
            matchedAccounts = 0;
        }
        if (mismatchedAccounts == null) {
            mismatchedAccounts = 0;
        }
        if (differenceAmount == null) {
            differenceAmount = BigDecimal.ZERO;
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getReconciliationId() {
        return reconciliationId;
    }

    public void setReconciliationId(String reconciliationId) {
        this.reconciliationId = reconciliationId;
    }

    public ReconciliationType getReconciliationType() {
        return reconciliationType;
    }

    public void setReconciliationType(ReconciliationType reconciliationType) {
        this.reconciliationType = reconciliationType;
    }

    public ReconciliationStatus getStatus() {
        return status;
    }

    public void setStatus(ReconciliationStatus status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public Integer getTotalAccounts() {
        return totalAccounts;
    }

    public void setTotalAccounts(Integer totalAccounts) {
        this.totalAccounts = totalAccounts;
    }

    public Integer getMatchedAccounts() {
        return matchedAccounts;
    }

    public void setMatchedAccounts(Integer matchedAccounts) {
        this.matchedAccounts = matchedAccounts;
    }

    public Integer getMismatchedAccounts() {
        return mismatchedAccounts;
    }

    public void setMismatchedAccounts(Integer mismatchedAccounts) {
        this.mismatchedAccounts = mismatchedAccounts;
    }

    public BigDecimal getDifferenceAmount() {
        return differenceAmount;
    }

    public void setDifferenceAmount(BigDecimal differenceAmount) {
        this.differenceAmount = differenceAmount;
    }

    public String getInitiatedBy() {
        return initiatedBy;
    }

    public void setInitiatedBy(String initiatedBy) {
        this.initiatedBy = initiatedBy;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }
}
