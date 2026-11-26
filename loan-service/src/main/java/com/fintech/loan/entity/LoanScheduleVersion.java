package com.fintech.loan.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_schedule_versions")
public class LoanScheduleVersion {

    @Id
    private UUID id;

    @Column(name = "loan_account_id", nullable = false, length = 50)
    private String loanAccountId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "principal_basis", nullable = false, precision = 19, scale = 2)
    private BigDecimal principalBasis;

    @Column(name = "annual_interest_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal annualInterestRate;

    @Column(name = "remaining_tenure_months", nullable = false)
    private Integer remainingTenureMonths;

    @Column(name = "emi_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal emiAmount;

    @Column(name = "reason", nullable = false, length = 200)
    private String reason;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public BigDecimal getPrincipalBasis() { return principalBasis; }
    public void setPrincipalBasis(BigDecimal principalBasis) { this.principalBasis = principalBasis; }
    public BigDecimal getAnnualInterestRate() { return annualInterestRate; }
    public void setAnnualInterestRate(BigDecimal annualInterestRate) { this.annualInterestRate = annualInterestRate; }
    public Integer getRemainingTenureMonths() { return remainingTenureMonths; }
    public void setRemainingTenureMonths(Integer remainingTenureMonths) { this.remainingTenureMonths = remainingTenureMonths; }
    public BigDecimal getEmiAmount() { return emiAmount; }
    public void setEmiAmount(BigDecimal emiAmount) { this.emiAmount = emiAmount; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
