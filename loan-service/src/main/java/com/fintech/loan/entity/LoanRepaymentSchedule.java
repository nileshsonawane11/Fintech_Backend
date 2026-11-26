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

    @Column(name = "installment_id", unique = true, length = 64)
    private String installmentId;

    @Column(name = "loan_account_id", nullable = false, length = 50)
    private String loanAccountId;

    @Column(name = "schedule_version", nullable = false)
    private Integer scheduleVersion = 1;

    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "grace_period_end_date")
    private LocalDate gracePeriodEndDate;

    @Column(name = "opening_principal", precision = 19, scale = 2)
    private BigDecimal openingPrincipal;

    @Column(name = "closing_principal", precision = 19, scale = 2)
    private BigDecimal closingPrincipal;

    @Column(name = "principal_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "interest_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal interestAmount;

    @Column(name = "charges_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal chargesAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "principal_paid", nullable = false, precision = 19, scale = 2)
    private BigDecimal principalPaid = BigDecimal.ZERO;

    @Column(name = "interest_paid", nullable = false, precision = 19, scale = 2)
    private BigDecimal interestPaid = BigDecimal.ZERO;

    @Column(name = "charges_paid", nullable = false, precision = 19, scale = 2)
    private BigDecimal chargesPaid = BigDecimal.ZERO;

    @Column(name = "remaining_amount", precision = 19, scale = 2)
    private BigDecimal remainingAmount;

    @Column(name = "outstanding_balance_after", nullable = false, precision = 15, scale = 2)
    private BigDecimal outstandingBalanceAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private InstallmentStatus status = InstallmentStatus.UPCOMING;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public LoanRepaymentSchedule() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (installmentId == null && loanAccountId != null && installmentNumber != null) {
            installmentId = "INST-" + loanAccountId + "-" + installmentNumber;
        }
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (paidAmount == null) paidAmount = BigDecimal.ZERO;
        if (principalPaid == null) principalPaid = BigDecimal.ZERO;
        if (interestPaid == null) interestPaid = BigDecimal.ZERO;
        if (chargesAmount == null) chargesAmount = BigDecimal.ZERO;
        if (chargesPaid == null) chargesPaid = BigDecimal.ZERO;
        if (remainingAmount == null && totalAmount != null) {
            remainingAmount = totalAmount.add(chargesAmount).subtract(paidAmount).max(BigDecimal.ZERO);
        }
        if (gracePeriodEndDate == null && dueDate != null) {
            gracePeriodEndDate = dueDate.plusDays(5);
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getInstallmentId() { return installmentId; }
    public void setInstallmentId(String installmentId) { this.installmentId = installmentId; }
    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }
    public Integer getScheduleVersion() { return scheduleVersion; }
    public void setScheduleVersion(Integer scheduleVersion) { this.scheduleVersion = scheduleVersion; }
    public Integer getInstallmentNumber() { return installmentNumber; }
    public void setInstallmentNumber(Integer installmentNumber) { this.installmentNumber = installmentNumber; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public LocalDate getGracePeriodEndDate() { return gracePeriodEndDate; }
    public void setGracePeriodEndDate(LocalDate gracePeriodEndDate) { this.gracePeriodEndDate = gracePeriodEndDate; }
    public BigDecimal getOpeningPrincipal() { return openingPrincipal; }
    public void setOpeningPrincipal(BigDecimal openingPrincipal) { this.openingPrincipal = openingPrincipal; }
    public BigDecimal getClosingPrincipal() { return closingPrincipal; }
    public void setClosingPrincipal(BigDecimal closingPrincipal) { this.closingPrincipal = closingPrincipal; }
    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }
    public BigDecimal getInterestAmount() { return interestAmount; }
    public void setInterestAmount(BigDecimal interestAmount) { this.interestAmount = interestAmount; }
    public BigDecimal getChargesAmount() { return chargesAmount; }
    public void setChargesAmount(BigDecimal chargesAmount) { this.chargesAmount = chargesAmount; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }
    public BigDecimal getPrincipalPaid() { return principalPaid; }
    public void setPrincipalPaid(BigDecimal principalPaid) { this.principalPaid = principalPaid; }
    public BigDecimal getInterestPaid() { return interestPaid; }
    public void setInterestPaid(BigDecimal interestPaid) { this.interestPaid = interestPaid; }
    public BigDecimal getChargesPaid() { return chargesPaid; }
    public void setChargesPaid(BigDecimal chargesPaid) { this.chargesPaid = chargesPaid; }
    public BigDecimal getRemainingAmount() { return remainingAmount; }
    public void setRemainingAmount(BigDecimal remainingAmount) { this.remainingAmount = remainingAmount; }
    public BigDecimal getOutstandingBalanceAfter() { return outstandingBalanceAfter; }
    public void setOutstandingBalanceAfter(BigDecimal outstandingBalanceAfter) { this.outstandingBalanceAfter = outstandingBalanceAfter; }
    public InstallmentStatus getStatus() { return status; }
    public void setStatus(InstallmentStatus status) { this.status = status; }
    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
