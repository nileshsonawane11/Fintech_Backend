package com.fintech.payment.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "incoming_payments")
public class IncomingPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "incoming_payment_id", nullable = false, unique = true, length = 50)
    private String incomingPaymentId;

    @Column(name = "receiver_id", length = 50)
    private String receiverId;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "customer_id", length = 100)
    private String customerId;

    @Column(name = "finbank_account_id", nullable = false, length = 50)
    private String finbankAccountId;

    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @Column(name = "provider_payment_id", nullable = false, unique = true, length = 100)
    private String providerPaymentId;

    @Column(name = "provider_va_id", nullable = false, length = 100)
    private String providerVaId;

    @Column(name = "channel", nullable = false, length = 30)
    private String channel;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "fee_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal feeAmount = BigDecimal.ZERO;

    @Column(name = "net_credit_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal netCreditAmount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Column(name = "payer_name", length = 200)
    private String payerName;

    @Column(name = "payer_vpa_masked", length = 150)
    private String payerVpaMasked;

    @Column(name = "payer_bank", length = 100)
    private String payerBank;

    @Column(name = "utr", length = 100)
    private String utr;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "settlement_eligible", nullable = false)
    private boolean settlementEligible;

    @Column(name = "ledger_transaction_id", length = 100)
    private String ledgerTransactionId;

    @Column(name = "refund_id", length = 100)
    private String refundId;

    @Column(name = "refund_amount", precision = 19, scale = 4)
    private BigDecimal refundAmount;

    @Column(name = "ledger_refund_tx_id", length = 100)
    private String ledgerRefundTxId;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "credited_at")
    private Instant creditedAt;

    @Column(name = "refunded_at")
    private Instant refundedAt;

    @Column(name = "reconciled_at")
    private Instant reconciledAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (receivedAt == null) receivedAt = now;
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getIncomingPaymentId() { return incomingPaymentId; }
    public void setIncomingPaymentId(String incomingPaymentId) { this.incomingPaymentId = incomingPaymentId; }
    public String getReceiverId() { return receiverId; }
    public void setReceiverId(String receiverId) { this.receiverId = receiverId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getFinbankAccountId() { return finbankAccountId; }
    public void setFinbankAccountId(String finbankAccountId) { this.finbankAccountId = finbankAccountId; }
    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }
    public String getProviderPaymentId() { return providerPaymentId; }
    public void setProviderPaymentId(String providerPaymentId) { this.providerPaymentId = providerPaymentId; }
    public String getProviderVaId() { return providerVaId; }
    public void setProviderVaId(String providerVaId) { this.providerVaId = providerVaId; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getFeeAmount() { return feeAmount; }
    public void setFeeAmount(BigDecimal feeAmount) { this.feeAmount = feeAmount; }
    public BigDecimal getNetCreditAmount() { return netCreditAmount; }
    public void setNetCreditAmount(BigDecimal netCreditAmount) { this.netCreditAmount = netCreditAmount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getPayerName() { return payerName; }
    public void setPayerName(String payerName) { this.payerName = payerName; }
    public String getPayerVpaMasked() { return payerVpaMasked; }
    public void setPayerVpaMasked(String payerVpaMasked) { this.payerVpaMasked = payerVpaMasked; }
    public String getPayerBank() { return payerBank; }
    public void setPayerBank(String payerBank) { this.payerBank = payerBank; }
    public String getUtr() { return utr; }
    public void setUtr(String utr) { this.utr = utr; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isSettlementEligible() { return settlementEligible; }
    public void setSettlementEligible(boolean settlementEligible) { this.settlementEligible = settlementEligible; }
    public String getLedgerTransactionId() { return ledgerTransactionId; }
    public void setLedgerTransactionId(String ledgerTransactionId) { this.ledgerTransactionId = ledgerTransactionId; }
    public String getRefundId() { return refundId; }
    public void setRefundId(String refundId) { this.refundId = refundId; }
    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
    public String getLedgerRefundTxId() { return ledgerRefundTxId; }
    public void setLedgerRefundTxId(String ledgerRefundTxId) { this.ledgerRefundTxId = ledgerRefundTxId; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Instant verifiedAt) { this.verifiedAt = verifiedAt; }
    public Instant getCreditedAt() { return creditedAt; }
    public void setCreditedAt(Instant creditedAt) { this.creditedAt = creditedAt; }
    public Instant getRefundedAt() { return refundedAt; }
    public void setRefundedAt(Instant refundedAt) { this.refundedAt = refundedAt; }
    public Instant getReconciledAt() { return reconciledAt; }
    public void setReconciledAt(Instant reconciledAt) { this.reconciledAt = reconciledAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
