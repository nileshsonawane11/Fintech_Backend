package com.fintech.loan.entity;

import com.fintech.loan.enums.RepaymentAccountStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_repayment_accounts")
public class LoanRepaymentAccount {

    @Id
    private UUID id;

    @Column(name = "repayment_account_id", nullable = false, unique = true, length = 64)
    private String repaymentAccountId;

    @Column(name = "loan_account_id", nullable = false, length = 50)
    private String loanAccountId;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "identity_subject", length = 100)
    private String identitySubject;

    @Column(name = "external_account_id", nullable = false, length = 100)
    private String externalAccountId;

    @Column(name = "masked_account_number", nullable = false, length = 40)
    private String maskedAccountNumber;

    @Column(name = "account_type", nullable = false, length = 30)
    private String accountType;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "is_primary", nullable = false)
    private boolean primary = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private RepaymentAccountStatus status = RepaymentAccountStatus.ACTIVE;

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
    public String getRepaymentAccountId() { return repaymentAccountId; }
    public void setRepaymentAccountId(String repaymentAccountId) { this.repaymentAccountId = repaymentAccountId; }
    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }
    public String getExternalAccountId() { return externalAccountId; }
    public void setExternalAccountId(String externalAccountId) { this.externalAccountId = externalAccountId; }
    public String getMaskedAccountNumber() { return maskedAccountNumber; }
    public void setMaskedAccountNumber(String maskedAccountNumber) { this.maskedAccountNumber = maskedAccountNumber; }
    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public boolean isPrimary() { return primary; }
    public void setPrimary(boolean primary) { this.primary = primary; }
    public RepaymentAccountStatus getStatus() { return status; }
    public void setStatus(RepaymentAccountStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
