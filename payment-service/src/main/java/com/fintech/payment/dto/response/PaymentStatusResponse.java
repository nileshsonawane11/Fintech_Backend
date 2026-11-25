package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public class PaymentStatusResponse {
    private String paymentId;
    private String transactionId;
    private String status;
    private BigDecimal amount;
    private BigDecimal feeAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalDebitAmount;
    private String currency;
    private String transferMode;
    private String transferType;
    private String debitAccountId;
    private String beneficiaryId;
    private String railReference;
    private String providerUtr;
    private String ledgerTransactionId;
    private String ledgerReversalTxId;
    private String failureCode;
    private String failureReason;
    private Instant createdAt;
    private Instant completedAt;

    public PaymentStatusResponse() { }

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getFeeAmount() { return feeAmount; }
    public void setFeeAmount(BigDecimal feeAmount) { this.feeAmount = feeAmount; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
    public BigDecimal getTotalDebitAmount() { return totalDebitAmount; }
    public void setTotalDebitAmount(BigDecimal totalDebitAmount) { this.totalDebitAmount = totalDebitAmount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getTransferMode() { return transferMode; }
    public void setTransferMode(String transferMode) { this.transferMode = transferMode; }
    public String getTransferType() { return transferType; }
    public void setTransferType(String transferType) { this.transferType = transferType; }
    public String getDebitAccountId() { return debitAccountId; }
    public void setDebitAccountId(String debitAccountId) { this.debitAccountId = debitAccountId; }
    public String getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(String beneficiaryId) { this.beneficiaryId = beneficiaryId; }
    public String getRailReference() { return railReference; }
    public void setRailReference(String railReference) { this.railReference = railReference; }
    public String getProviderUtr() { return providerUtr; }
    public void setProviderUtr(String providerUtr) { this.providerUtr = providerUtr; }
    public String getLedgerTransactionId() { return ledgerTransactionId; }
    public void setLedgerTransactionId(String ledgerTransactionId) { this.ledgerTransactionId = ledgerTransactionId; }
    public String getLedgerReversalTxId() { return ledgerReversalTxId; }
    public void setLedgerReversalTxId(String ledgerReversalTxId) { this.ledgerReversalTxId = ledgerReversalTxId; }
    public String getFailureCode() { return failureCode; }
    public void setFailureCode(String failureCode) { this.failureCode = failureCode; }
    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
