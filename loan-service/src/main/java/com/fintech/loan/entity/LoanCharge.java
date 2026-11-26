package com.fintech.loan.entity;

import com.fintech.loan.enums.LoanChargeStatus;
import com.fintech.loan.enums.LoanChargeType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "loan_charges")
public class LoanCharge {

    @Id
    private UUID id;

    @Column(name = "charge_id", nullable = false, unique = true, length = 64)
    private String chargeId;

    @Column(name = "loan_account_id", nullable = false, length = 50)
    private String loanAccountId;

    @Column(name = "installment_id", length = 64)
    private String installmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "charge_type", nullable = false, length = 40)
    private LoanChargeType chargeType;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "paid_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "waived_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal waivedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private LoanChargeStatus status = LoanChargeStatus.PENDING;

    @Column(name = "reason", length = 300)
    private String reason;

    @Column(name = "waived_by", length = 100)
    private String waivedBy;

    @Column(name = "waived_at")
    private Instant waivedAt;

    @Column(name = "assessed_date", nullable = false)
    private LocalDate assessedDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (assessedDate == null) assessedDate = LocalDate.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public BigDecimal getRemainingAmount() {
        return amount.subtract(paidAmount).subtract(waivedAmount).max(BigDecimal.ZERO);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getChargeId() { return chargeId; }
    public void setChargeId(String chargeId) { this.chargeId = chargeId; }
    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }
    public String getInstallmentId() { return installmentId; }
    public void setInstallmentId(String installmentId) { this.installmentId = installmentId; }
    public LoanChargeType getChargeType() { return chargeType; }
    public void setChargeType(LoanChargeType chargeType) { this.chargeType = chargeType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }
    public BigDecimal getWaivedAmount() { return waivedAmount; }
    public void setWaivedAmount(BigDecimal waivedAmount) { this.waivedAmount = waivedAmount; }
    public LoanChargeStatus getStatus() { return status; }
    public void setStatus(LoanChargeStatus status) { this.status = status; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getWaivedBy() { return waivedBy; }
    public void setWaivedBy(String waivedBy) { this.waivedBy = waivedBy; }
    public Instant getWaivedAt() { return waivedAt; }
    public void setWaivedAt(Instant waivedAt) { this.waivedAt = waivedAt; }
    public LocalDate getAssessedDate() { return assessedDate; }
    public void setAssessedDate(LocalDate assessedDate) { this.assessedDate = assessedDate; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
