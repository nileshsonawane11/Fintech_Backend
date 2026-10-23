package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class PaymentResponse {
    private String paymentId;
    private String transactionId;
    private String status;
    private BigDecimal amount;
    private String currency;
    private List<ChargeDto> charges;
    private Instant estimatedCompletionTime;

    public PaymentResponse() { }

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
    public List<ChargeDto> getCharges() { return charges; }
    public void setCharges(List<ChargeDto> charges) { this.charges = charges; }
    public Instant getEstimatedCompletionTime() { return estimatedCompletionTime; }
    public void setEstimatedCompletionTime(Instant estimatedCompletionTime) { this.estimatedCompletionTime = estimatedCompletionTime; }
}
