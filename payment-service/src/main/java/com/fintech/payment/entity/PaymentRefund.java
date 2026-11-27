package com.fintech.payment.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_refunds")
public class PaymentRefund {

    @Id
    private UUID id;

    @Column(name = "refund_id", nullable = false, unique = true, length = 50)
    private String refundId;

    @Column(name = "payment_id", nullable = false, length = 50)
    private String paymentId;

    @Column(name = "razorpay_payment_id", nullable = false, length = 100)
    private String razorpayPaymentId;

    @Column(name = "razorpay_refund_id", unique = true, length = 100)
    private String razorpayRefundId;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "idempotency_key", unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "ledger_reversal_tx_id", length = 100)
    private String ledgerReversalTxId;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getRefundId() { return refundId; }
    public void setRefundId(String refundId) { this.refundId = refundId; }
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }
    public String getRazorpayRefundId() { return razorpayRefundId; }
    public void setRazorpayRefundId(String razorpayRefundId) { this.razorpayRefundId = razorpayRefundId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getLedgerReversalTxId() { return ledgerReversalTxId; }
    public void setLedgerReversalTxId(String ledgerReversalTxId) { this.ledgerReversalTxId = ledgerReversalTxId; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
