package com.fintech.payment.dto.response;

import java.math.BigDecimal;

public class ChargeDto {
    private String chargeType;
    private BigDecimal amount;
    private String currency;

    public ChargeDto() { }

    public ChargeDto(String chargeType, BigDecimal amount, String currency) {
        this.chargeType = chargeType;
        this.amount = amount;
        this.currency = currency;
    }

    public String getChargeType() { return chargeType; }
    public void setChargeType(String chargeType) { this.chargeType = chargeType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
}
