package com.fintech.loan.entity;

import com.fintech.loan.enums.RepaymentMethod;
import com.fintech.loan.enums.RepaymentStatus;
import com.fintech.loan.enums.RepaymentType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_repayments")
public class LoanRepayment {

    @Id
    private UUID id;

    @Column(name = "repayment_id", nullable = false, unique = true, length = 64)
    private String repaymentId;

    @Column(name = "repayment_reference", nullable = false, unique = true, length = 64)
    private String repaymentReference;

    @Column(name = "idempotency_key", unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "loan_account_id", nullable = false, length = 50)
    private String loanAccountId;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "identity_subject", length = 100)
    private String identitySubject;

    @Column(name = "installment_id", length = 64)
    private String installmentId;

    @Column(name = "repayment_account_id", length = 64)
    private String repaymentAccountId;

    @Column(name = "mandate_id", length = 64)
    private String mandateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "repayment_type", nullable = false, length = 30)
    private RepaymentType repaymentType = RepaymentType.EMI;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private RepaymentMethod paymentMethod;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "principal_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal principalAmount = BigDecimal.ZERO;

    @Column(name = "interest_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal interestAmount = BigDecimal.ZERO;

    @Column(name = "charges_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal chargesAmount = BigDecimal.ZERO;

    @Column(name = "excess_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal excessAmount = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "repayment_status", nullable = false, length = 30)
    private RepaymentStatus repaymentStatus = RepaymentStatus.INITIATED;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "transaction_reference", length = 100)
    private String transactionReference;

    @Column(name = "ledger_transaction_reference", length = 100)
    private String ledgerTransactionReference;

    @Column(name = "receipt_reference", unique = true, length = 64)
    private String receiptReference;

    @Column(name = "auto_collection", nullable = false)
    private boolean autoCollection = false;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "reversed_at")
    private Instant reversedAt;

    @Column(name = "failure_code", length = 80)
    private String failureCode;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

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
        if (initiatedAt == null) initiatedAt = now;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getRepaymentId() { return repaymentId; }
    public void setRepaymentId(String repaymentId) { this.repaymentId = repaymentId; }
    public String getRepaymentReference() { return repaymentReference; }
    public void setRepaymentReference(String repaymentReference) { this.repaymentReference = repaymentReference; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }
    public String getInstallmentId() { return installmentId; }
    public void setInstallmentId(String installmentId) { this.installmentId = installmentId; }
    public String getRepaymentAccountId() { return repaymentAccountId; }
    public void setRepaymentAccountId(String repaymentAccountId) { this.repaymentAccountId = repaymentAccountId; }
    public String getMandateId() { return mandateId; }
    public void setMandateId(String mandateId) { this.mandateId = mandateId; }
    public RepaymentType getRepaymentType() { return repaymentType; }
    public void setRepaymentType(RepaymentType repaymentType) { this.repaymentType = repaymentType; }
    public RepaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(RepaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }
    public BigDecimal getInterestAmount() { return interestAmount; }
    public void setInterestAmount(BigDecimal interestAmount) { this.interestAmount = interestAmount; }
    public BigDecimal getChargesAmount() { return chargesAmount; }
    public void setChargesAmount(BigDecimal chargesAmount) { this.chargesAmount = chargesAmount; }
    public BigDecimal getExcessAmount() { return excessAmount; }
    public void setExcessAmount(BigDecimal excessAmount) { this.excessAmount = excessAmount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public RepaymentStatus getRepaymentStatus() { return repaymentStatus; }
    public void setRepaymentStatus(RepaymentStatus repaymentStatus) { this.repaymentStatus = repaymentStatus; }
    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }
    public String getTransactionReference() { return transactionReference; }
    public void setTransactionReference(String transactionReference) { this.transactionReference = transactionReference; }
    public String getLedgerTransactionReference() { return ledgerTransactionReference; }
    public void setLedgerTransactionReference(String ledgerTransactionReference) { this.ledgerTransactionReference = ledgerTransactionReference; }
    public String getReceiptReference() { return receiptReference; }
    public void setReceiptReference(String receiptReference) { this.receiptReference = receiptReference; }
    public boolean isAutoCollection() { return autoCollection; }
    public void setAutoCollection(boolean autoCollection) { this.autoCollection = autoCollection; }
    public Instant getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(Instant initiatedAt) { this.initiatedAt = initiatedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Instant getReversedAt() { return reversedAt; }
    public void setReversedAt(Instant reversedAt) { this.reversedAt = reversedAt; }
    public String getFailureCode() { return failureCode; }
    public void setFailureCode(String failureCode) { this.failureCode = failureCode; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
