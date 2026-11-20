package com.fintech.card.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

@Schema(description = "Request body payload for credit card bill repayment")
public class PayCardRequest {

    @Schema(description = "Identifier of the funding account to debit", example = "ACC-1001")
    private String accountId;

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "1.00", message = "Payment amount must be at least ₹1.00")
    @Schema(description = "Amount in INR to repay towards the credit card balance", example = "18450.00")
    private BigDecimal amount;

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
