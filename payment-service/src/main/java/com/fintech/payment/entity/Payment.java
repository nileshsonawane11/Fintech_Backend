package com.fintech.payment.entity;

import com.fintech.payment.enums.PaymentPurpose;
import com.fintech.payment.enums.PaymentTransactionStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", length = 36)
    private UUID id;

    @Column(name = "payment_id", nullable = false, unique = true, length = 50)
    private String paymentId;

    @Column(name = "user_id", nullable = false, length = 100)
    private String identitySubject;

    @Column(name = "customer_id", length = 100)
    private String customerId;

    @Column(name = "source_account_id", length = 100)
    private String sourceAccountId;

    @Column(name = "destination_account_id", length = 100)
    private String destinationAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 40)
    private PaymentPurpose purpose;

    @Column(name = "source_service", nullable = false, length = 50)
    private String sourceService = "PAYMENT-SERVICE";

    @Column(name = "business_reference", length = 100)
    private String businessReference;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private PaymentTransactionStatus status;

    @Column(name = "razorpay_order_id", unique = true, length = 100)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", unique = true, length = 100)
    private String razorpayPaymentId;

    @Column(name = "razorpay_signature_verified", nullable = false)
    private boolean razorpaySignatureVerified = false;

    @Column(name = "payment_method", length = 40)
    private String paymentMethod;

    @Column(name = "receipt", length = 80)
    private String receipt;

    @Column(name = "ledger_transaction_id", length = 100)
    private String ledgerTransactionId;

    @Column(name = "ledger_reversal_tx_id", length = 100)
    private String ledgerReversalTxId;

    @Column(name = "refunded_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    @Column(name = "idempotency_key", unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Column(name = "failure_code", length = 80)
    private String failureCode;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Column(name = "captured_at")
    private Instant capturedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "reconciled_at")
    private Instant reconciledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (refundedAmount == null) {
            refundedAmount = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getSourceAccountId() { return sourceAccountId; }
    public void setSourceAccountId(String sourceAccountId) { this.sourceAccountId = sourceAccountId; }
    public String getDestinationAccountId() { return destinationAccountId; }
    public void setDestinationAccountId(String destinationAccountId) { this.destinationAccountId = destinationAccountId; }
    public PaymentPurpose getPurpose() { return purpose; }
    public void setPurpose(PaymentPurpose purpose) { this.purpose = purpose; }
    public String getSourceService() { return sourceService; }
    public void setSourceService(String sourceService) { this.sourceService = sourceService; }
    public String getBusinessReference() { return businessReference; }
    public void setBusinessReference(String businessReference) { this.businessReference = businessReference; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public PaymentTransactionStatus getStatus() { return status; }
    public void setStatus(PaymentTransactionStatus status) { this.status = status; }
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }
    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }
    public boolean isRazorpaySignatureVerified() { return razorpaySignatureVerified; }
    public void setRazorpaySignatureVerified(boolean razorpaySignatureVerified) { this.razorpaySignatureVerified = razorpaySignatureVerified; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getReceipt() { return receipt; }
    public void setReceipt(String receipt) { this.receipt = receipt; }
    public String getLedgerTransactionId() { return ledgerTransactionId; }
    public void setLedgerTransactionId(String ledgerTransactionId) { this.ledgerTransactionId = ledgerTransactionId; }
    public String getLedgerReversalTxId() { return ledgerReversalTxId; }
    public void setLedgerReversalTxId(String ledgerReversalTxId) { this.ledgerReversalTxId = ledgerReversalTxId; }
    public BigDecimal getRefundedAmount() { return refundedAmount; }
    public void setRefundedAmount(BigDecimal refundedAmount) { this.refundedAmount = refundedAmount; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }
    public String getFailureCode() { return failureCode; }
    public void setFailureCode(String failureCode) { this.failureCode = failureCode; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }
    public Instant getCapturedAt() { return capturedAt; }
    public void setCapturedAt(Instant capturedAt) { this.capturedAt = capturedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Instant getReconciledAt() { return reconciledAt; }
    public void setReconciledAt(Instant reconciledAt) { this.reconciledAt = reconciledAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
