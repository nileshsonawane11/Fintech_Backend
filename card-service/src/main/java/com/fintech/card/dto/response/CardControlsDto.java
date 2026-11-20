package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Payment card transaction channel controls and status")
public class CardControlsDto {

    @Schema(description = "Whether online/e-commerce transactions are permitted", example = "true")
    private boolean online = true;

    @Schema(description = "Online transactions enabled (canonical alias)", example = "true")
    private boolean onlineEnabled = true;

    @Schema(description = "Whether international transactions are permitted", example = "false")
    private boolean international = false;

    @Schema(description = "International transactions enabled (canonical alias)", example = "false")
    private boolean internationalEnabled = false;

    @Schema(description = "Whether contactless (NFC / tap-to-pay) is enabled", example = "true")
    private boolean contactless = true;

    @Schema(description = "Contactless transactions enabled (canonical alias)", example = "true")
    private boolean contactlessEnabled = true;

    @Schema(description = "Whether ATM cash withdrawals are enabled", example = "true")
    private boolean atm = true;

    @Schema(description = "ATM withdrawals enabled (canonical alias)", example = "true")
    private boolean atmWithdrawalEnabled = true;

    @Schema(description = "Daily aggregate spending limit in INR", example = "50000.00")
    private BigDecimal dailyLimit = new BigDecimal("50000.00");

    public boolean isOnline() { return online; }
    public void setOnline(boolean online) {
        this.online = online;
        this.onlineEnabled = online;
    }

    public boolean isOnlineEnabled() { return onlineEnabled; }
    public void setOnlineEnabled(boolean onlineEnabled) {
        this.onlineEnabled = onlineEnabled;
        this.online = onlineEnabled;
    }

    public boolean isInternational() { return international; }
    public void setInternational(boolean international) {
        this.international = international;
        this.internationalEnabled = international;
    }

    public boolean isInternationalEnabled() { return internationalEnabled; }
    public void setInternationalEnabled(boolean internationalEnabled) {
        this.internationalEnabled = internationalEnabled;
        this.international = internationalEnabled;
    }

    public boolean isContactless() { return contactless; }
    public void setContactless(boolean contactless) {
        this.contactless = contactless;
        this.contactlessEnabled = contactless;
    }

    public boolean isContactlessEnabled() { return contactlessEnabled; }
    public void setContactlessEnabled(boolean contactlessEnabled) {
        this.contactlessEnabled = contactlessEnabled;
        this.contactless = contactlessEnabled;
    }

    public boolean isAtm() { return atm; }
    public void setAtm(boolean atm) {
        this.atm = atm;
        this.atmWithdrawalEnabled = atm;
    }

    public boolean isAtmWithdrawalEnabled() { return atmWithdrawalEnabled; }
    public void setAtmWithdrawalEnabled(boolean atmWithdrawalEnabled) {
        this.atmWithdrawalEnabled = atmWithdrawalEnabled;
        this.atm = atmWithdrawalEnabled;
    }

    public BigDecimal getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(BigDecimal dailyLimit) { this.dailyLimit = dailyLimit; }
}
