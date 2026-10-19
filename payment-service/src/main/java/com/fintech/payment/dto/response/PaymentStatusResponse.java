package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public class PaymentStatusResponse {
    private String paymentId;
    private String transactionId;
    private String status;
    private BigDecimal amount;
    private String currency;
    private String transferMode;
    private String railReference;
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
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getTransferMode() { return transferMode; }
    public void setTransferMode(String transferMode) { this.transferMode = transferMode; }
    public String getRailReference() { return railReference; }
    public void setRailReference(String railReference) { this.railReference = railReference; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
