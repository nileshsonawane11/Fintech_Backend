package com.fintech.card.entity.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.io.Serializable;
import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class LatePaymentChargeSlab implements Serializable {

    private BigDecimal fromAmount;
    private BigDecimal toAmount;
    private BigDecimal charge;

    public LatePaymentChargeSlab() {
    }

    public LatePaymentChargeSlab(BigDecimal fromAmount, BigDecimal toAmount, BigDecimal charge) {
        this.fromAmount = fromAmount;
        this.toAmount = toAmount;
        this.charge = charge;
    }

    public BigDecimal getFromAmount() {
        return fromAmount;
    }

    public void setFromAmount(BigDecimal fromAmount) {
        this.fromAmount = fromAmount;
    }

    public BigDecimal getToAmount() {
        return toAmount;
    }

    public void setToAmount(BigDecimal toAmount) {
        this.toAmount = toAmount;
    }

    public BigDecimal getCharge() {
        return charge;
    }

    public void setCharge(BigDecimal charge) {
        this.charge = charge;
    }
}
