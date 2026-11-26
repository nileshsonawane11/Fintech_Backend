package com.fintech.loan.entity;

import com.fintech.loan.enums.MandateStatus;
import com.fintech.loan.enums.MandateType;
import com.fintech.loan.enums.RepaymentFrequency;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "loan_repayment_mandates")
public class LoanRepaymentMandate {

    @Id
    private UUID id;

    @Column(name = "mandate_id", nullable = false, unique = true, length = 64)
    private String mandateId;

    @Column(name = "loan_account_id", nullable = false, length = 50)
    private String loanAccountId;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "identity_subject", length = 100)
    private String identitySubject;

    @Column(name = "repayment_account_id", length = 64)
    private String repaymentAccountId;

    @Column(name = "provider_reference", length = 100)
    private String providerReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "mandate_type", nullable = false, length = 30)
    private MandateType mandateType;

    @Column(name = "max_authorized_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal maxAuthorizedAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 30)
    private RepaymentFrequency frequency = RepaymentFrequency.MONTHLY;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MandateStatus status = MandateStatus.PENDING;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "activated_at")
    private Instant activatedAt;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getMandateId() { return mandateId; }
    public void setMandateId(String mandateId) { this.mandateId = mandateId; }
    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }
    public String getRepaymentAccountId() { return repaymentAccountId; }
    public void setRepaymentAccountId(String repaymentAccountId) { this.repaymentAccountId = repaymentAccountId; }
    public String getProviderReference() { return providerReference; }
    public void setProviderReference(String providerReference) { this.providerReference = providerReference; }
    public MandateType getMandateType() { return mandateType; }
    public void setMandateType(MandateType mandateType) { this.mandateType = mandateType; }
    public BigDecimal getMaxAuthorizedAmount() { return maxAuthorizedAmount; }
    public void setMaxAuthorizedAmount(BigDecimal maxAuthorizedAmount) { this.maxAuthorizedAmount = maxAuthorizedAmount; }
    public RepaymentFrequency getFrequency() { return frequency; }
    public void setFrequency(RepaymentFrequency frequency) { this.frequency = frequency; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public MandateStatus getStatus() { return status; }
    public void setStatus(MandateStatus status) { this.status = status; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public Instant getActivatedAt() { return activatedAt; }
    public void setActivatedAt(Instant activatedAt) { this.activatedAt = activatedAt; }
    public Instant getPausedAt() { return pausedAt; }
    public void setPausedAt(Instant pausedAt) { this.pausedAt = pausedAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
