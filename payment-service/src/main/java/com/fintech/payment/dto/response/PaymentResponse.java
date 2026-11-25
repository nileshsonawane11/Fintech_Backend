package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class PaymentResponse {
    private String paymentId;
    private String transactionId;
    private String ledgerTransactionId;
    private String status;
    private BigDecimal amount;
    private BigDecimal feeAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalDebitAmount;
    private String currency;
    private String transferMode;
    private String transferType;
    private String providerPayoutId;
    private List<ChargeDto> charges;
    private Instant estimatedCompletionTime;

    public PaymentResponse() { }

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public String getLedgerTransactionId() { return ledgerTransactionId; }
    public void setLedgerTransactionId(String ledgerTransactionId) { this.ledgerTransactionId = ledgerTransactionId; }
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
    public String getProviderPayoutId() { return providerPayoutId; }
    public void setProviderPayoutId(String providerPayoutId) { this.providerPayoutId = providerPayoutId; }
    public List<ChargeDto> getCharges() { return charges; }
    public void setCharges(List<ChargeDto> charges) { this.charges = charges; }
    public Instant getEstimatedCompletionTime() { return estimatedCompletionTime; }
    public void setEstimatedCompletionTime(Instant estimatedCompletionTime) { this.estimatedCompletionTime = estimatedCompletionTime; }
}
