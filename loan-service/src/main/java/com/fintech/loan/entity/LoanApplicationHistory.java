package com.fintech.loan.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_application_history")
public class LoanApplicationHistory {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "loan_application_id", nullable = false, length = 50)
    private String loanApplicationId;

    @Column(name = "previous_status", length = 50)
    private String previousStatus;

    @Column(name = "new_status", nullable = false, length = 50)
    private String newStatus;

    @Column(name = "changed_by", nullable = false, length = 100)
    private String changedBy;

    @Column(name = "changed_by_role", nullable = false, length = 50)
    private String changedByRole;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "reason", length = 500)
    private String reason;

    public LoanApplicationHistory() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (changedAt == null) {
            changedAt = Instant.now();
        }
    }

    public static LoanApplicationHistory record(String loanApplicationId, String previousStatus, String newStatus,
                                                String changedBy, String changedByRole, String remarks, String reason) {
        LoanApplicationHistory history = new LoanApplicationHistory();
        history.setId(UUID.randomUUID());
        history.setLoanApplicationId(loanApplicationId);
        history.setPreviousStatus(previousStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy(changedBy);
        history.setChangedByRole(changedByRole);
        history.setChangedAt(Instant.now());
        history.setRemarks(remarks);
        history.setReason(reason);
        return history;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }

    public String getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(String previousStatus) { this.previousStatus = previousStatus; }

    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }

    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }

    public String getChangedByRole() { return changedByRole; }
    public void setChangedByRole(String changedByRole) { this.changedByRole = changedByRole; }

    public Instant getChangedAt() { return changedAt; }
    public void setChangedAt(Instant changedAt) { this.changedAt = changedAt; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
