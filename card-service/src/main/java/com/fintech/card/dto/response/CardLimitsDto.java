package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Payment card spending and withdrawal limit configuration")
public class CardLimitsDto {

    @Schema(description = "Daily POS and online spend limit in INR", example = "50000.00")
    private BigDecimal dailySpend;

    @Schema(description = "Daily POS and online spend limit (alias for dailySpend)", example = "50000.00")
    private BigDecimal spendDaily;

    @Schema(description = "Daily ATM withdrawal limit in INR", example = "25000.00")
    private BigDecimal atmWithdrawal;

    @Schema(description = "Daily ATM withdrawal limit (alias for atmWithdrawal)", example = "25000.00")
    private BigDecimal atmDaily;

    public CardLimitsDto() {}

    public CardLimitsDto(BigDecimal dailySpend, BigDecimal atmWithdrawal) {
        this.dailySpend = dailySpend;
        this.spendDaily = dailySpend;
        this.atmWithdrawal = atmWithdrawal;
        this.atmDaily = atmWithdrawal;
    }

    public BigDecimal getDailySpend() { return dailySpend; }
    public void setDailySpend(BigDecimal dailySpend) {
        this.dailySpend = dailySpend;
        this.spendDaily = dailySpend;
    }

    public BigDecimal getSpendDaily() { return spendDaily; }
    public void setSpendDaily(BigDecimal spendDaily) {
        this.spendDaily = spendDaily;
        this.dailySpend = spendDaily;
    }

    public BigDecimal getAtmWithdrawal() { return atmWithdrawal; }
    public void setAtmWithdrawal(BigDecimal atmWithdrawal) {
        this.atmWithdrawal = atmWithdrawal;
        this.atmDaily = atmWithdrawal;
    }

    public BigDecimal getAtmDaily() { return atmDaily; }
    public void setAtmDaily(BigDecimal atmDaily) {
        this.atmDaily = atmDaily;
        this.atmWithdrawal = atmDaily;
    }
}
