package com.fintech.loan.entity;

import com.fintech.loan.enums.InstallmentStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
        name = "loan_repayment_schedules",
        uniqueConstraints = @UniqueConstraint(columnNames = {"loan_account_id", "installment_number"})
)
public class LoanRepaymentSchedule {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "loan_account_id", nullable = false, length = 50)
    private String loanAccountId;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "principal_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "interest_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal interestAmount;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "outstanding_balance_after", nullable = false, precision = 15, scale = 2)
    private BigDecimal outstandingBalanceAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private InstallmentStatus status = InstallmentStatus.DUE;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public LoanRepaymentSchedule() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (paidAmount == null) {
            paidAmount = BigDecimal.ZERO;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }

    public Integer getInstallmentNumber() { return installmentNumber; }
    public void setInstallmentNumber(Integer installmentNumber) { this.installmentNumber = installmentNumber; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }

    public BigDecimal getInterestAmount() { return interestAmount; }
    public void setInterestAmount(BigDecimal interestAmount) { this.interestAmount = interestAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getOutstandingBalanceAfter() { return outstandingBalanceAfter; }
    public void setOutstandingBalanceAfter(BigDecimal outstandingBalanceAfter) { this.outstandingBalanceAfter = outstandingBalanceAfter; }

    public InstallmentStatus getStatus() { return status; }
    public void setStatus(InstallmentStatus status) { this.status = status; }

    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
