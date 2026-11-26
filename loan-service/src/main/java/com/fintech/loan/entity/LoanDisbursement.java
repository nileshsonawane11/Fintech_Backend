package com.fintech.loan.entity;

import com.fintech.loan.enums.DisbursementStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "loan_disbursements")
public class LoanDisbursement {

    @Id
    private UUID id;

    @Column(name = "disbursement_reference", nullable = false, unique = true, length = 64)
    private String disbursementReference;

    @Column(name = "idempotency_key", unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "loan_application_id", nullable = false, unique = true, length = 50)
    private String loanApplicationId;

    @Column(name = "loan_account_id", length = 50)
    private String loanAccountId;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "identity_subject", length = 100)
    private String identitySubject;

    @Column(name = "requested_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "approved_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal approvedAmount;

    @Column(name = "disbursed_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal disbursedAmount;

    @Column(name = "upfront_fee_deducted", nullable = false, precision = 19, scale = 2)
    private BigDecimal upfrontFeeDeducted = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "destination_account_reference", nullable = false, length = 100)
    private String destinationAccountReference;

    @Column(name = "account_transaction_reference", length = 100)
    private String accountTransactionReference;

    @Column(name = "ledger_transaction_reference", length = 100)
    private String ledgerTransactionReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "disbursement_status", nullable = false, length = 40)
    private DisbursementStatus disbursementStatus = DisbursementStatus.INITIATED;

    @Column(name = "disbursement_date")
    private LocalDate disbursementDate;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "disbursed_by", length = 100)
    private String disbursedBy;

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
    public String getDisbursementReference() { return disbursementReference; }
    public void setDisbursementReference(String disbursementReference) { this.disbursementReference = disbursementReference; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }
    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }
    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }
    public BigDecimal getApprovedAmount() { return approvedAmount; }
    public void setApprovedAmount(BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }
    public BigDecimal getDisbursedAmount() { return disbursedAmount; }
    public void setDisbursedAmount(BigDecimal disbursedAmount) { this.disbursedAmount = disbursedAmount; }
    public BigDecimal getUpfrontFeeDeducted() { return upfrontFeeDeducted; }
    public void setUpfrontFeeDeducted(BigDecimal upfrontFeeDeducted) { this.upfrontFeeDeducted = upfrontFeeDeducted; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getDestinationAccountReference() { return destinationAccountReference; }
    public void setDestinationAccountReference(String destinationAccountReference) { this.destinationAccountReference = destinationAccountReference; }
    public String getAccountTransactionReference() { return accountTransactionReference; }
    public void setAccountTransactionReference(String accountTransactionReference) { this.accountTransactionReference = accountTransactionReference; }
    public String getLedgerTransactionReference() { return ledgerTransactionReference; }
    public void setLedgerTransactionReference(String ledgerTransactionReference) { this.ledgerTransactionReference = ledgerTransactionReference; }
    public DisbursementStatus getDisbursementStatus() { return disbursementStatus; }
    public void setDisbursementStatus(DisbursementStatus disbursementStatus) { this.disbursementStatus = disbursementStatus; }
    public LocalDate getDisbursementDate() { return disbursementDate; }
    public void setDisbursementDate(LocalDate disbursementDate) { this.disbursementDate = disbursementDate; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public String getDisbursedBy() { return disbursedBy; }
    public void setDisbursedBy(String disbursedBy) { this.disbursedBy = disbursedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
