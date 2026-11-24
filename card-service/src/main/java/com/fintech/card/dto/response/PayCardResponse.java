package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Payment receipt confirmation for credit card bill repayment")
public class PayCardResponse {

    @Schema(description = "Whether the bill payment succeeded", example = "true")
    private boolean success;

    @Schema(description = "Payment reference transaction identifier", example = "PAY-CARD-589201")
    private String reference;

    @Schema(description = "Amount paid in INR", example = "18450.00")
    private BigDecimal paidAmount;

    @Schema(description = "Remaining outstanding credit balance on the card", example = "0.00")
    private BigDecimal outstandingAfter;

    @Schema(description = "Remaining available balance in funding account if known", example = "261050.00")
    private BigDecimal balanceAfter;

    public PayCardResponse() {}

    public PayCardResponse(boolean success, String reference, BigDecimal paidAmount, BigDecimal outstandingAfter) {
        this.success = success;
        this.reference = reference;
        this.paidAmount = paidAmount;
        this.outstandingAfter = outstandingAfter;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getOutstandingAfter() { return outstandingAfter; }
    public void setOutstandingAfter(BigDecimal outstandingAfter) { this.outstandingAfter = outstandingAfter; }

    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }
}
