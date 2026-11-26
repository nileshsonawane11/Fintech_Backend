package com.fintech.loan.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_repayment_allocations")
public class LoanRepaymentAllocation {

    @Id
    private UUID id;

    @Column(name = "allocation_id", nullable = false, unique = true, length = 64)
    private String allocationId;

    @Column(name = "repayment_id", nullable = false, length = 64)
    private String repaymentId;

    @Column(name = "loan_account_id", nullable = false, length = 50)
    private String loanAccountId;

    @Column(name = "installment_id", length = 64)
    private String installmentId;

    @Column(name = "principal_allocated", nullable = false, precision = 19, scale = 2)
    private BigDecimal principalAllocated = BigDecimal.ZERO;

    @Column(name = "interest_allocated", nullable = false, precision = 19, scale = 2)
    private BigDecimal interestAllocated = BigDecimal.ZERO;

    @Column(name = "overdue_interest_allocated", nullable = false, precision = 19, scale = 2)
    private BigDecimal overdueInterestAllocated = BigDecimal.ZERO;

    @Column(name = "late_charge_allocated", nullable = false, precision = 19, scale = 2)
    private BigDecimal lateChargeAllocated = BigDecimal.ZERO;

    @Column(name = "bounce_charge_allocated", nullable = false, precision = 19, scale = 2)
    private BigDecimal bounceChargeAllocated = BigDecimal.ZERO;

    @Column(name = "other_charge_allocated", nullable = false, precision = 19, scale = 2)
    private BigDecimal otherChargeAllocated = BigDecimal.ZERO;

    @Column(name = "total_allocated", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAllocated = BigDecimal.ZERO;

    @Column(name = "reversed", nullable = false)
    private boolean reversed = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getAllocationId() { return allocationId; }
    public void setAllocationId(String allocationId) { this.allocationId = allocationId; }
    public String getRepaymentId() { return repaymentId; }
    public void setRepaymentId(String repaymentId) { this.repaymentId = repaymentId; }
    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }
    public String getInstallmentId() { return installmentId; }
    public void setInstallmentId(String installmentId) { this.installmentId = installmentId; }
    public BigDecimal getPrincipalAllocated() { return principalAllocated; }
    public void setPrincipalAllocated(BigDecimal principalAllocated) { this.principalAllocated = principalAllocated; }
    public BigDecimal getInterestAllocated() { return interestAllocated; }
    public void setInterestAllocated(BigDecimal interestAllocated) { this.interestAllocated = interestAllocated; }
    public BigDecimal getOverdueInterestAllocated() { return overdueInterestAllocated; }
    public void setOverdueInterestAllocated(BigDecimal overdueInterestAllocated) { this.overdueInterestAllocated = overdueInterestAllocated; }
    public BigDecimal getLateChargeAllocated() { return lateChargeAllocated; }
    public void setLateChargeAllocated(BigDecimal lateChargeAllocated) { this.lateChargeAllocated = lateChargeAllocated; }
    public BigDecimal getBounceChargeAllocated() { return bounceChargeAllocated; }
    public void setBounceChargeAllocated(BigDecimal bounceChargeAllocated) { this.bounceChargeAllocated = bounceChargeAllocated; }
    public BigDecimal getOtherChargeAllocated() { return otherChargeAllocated; }
    public void setOtherChargeAllocated(BigDecimal otherChargeAllocated) { this.otherChargeAllocated = otherChargeAllocated; }
    public BigDecimal getTotalAllocated() { return totalAllocated; }
    public void setTotalAllocated(BigDecimal totalAllocated) { this.totalAllocated = totalAllocated; }
    public boolean isReversed() { return reversed; }
    public void setReversed(boolean reversed) { this.reversed = reversed; }
    public Instant getCreatedAt() { return createdAt; }
}
