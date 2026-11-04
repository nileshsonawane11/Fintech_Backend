package com.fintech.card.dto.response;

import java.math.BigDecimal;

public class CardControlsDto {
    private boolean onlineEnabled;
    private boolean internationalEnabled;
    private boolean contactlessEnabled;
    private boolean atmWithdrawalEnabled;
    private BigDecimal dailyLimit;

    public boolean isOnlineEnabled() { return onlineEnabled; }
    public void setOnlineEnabled(boolean onlineEnabled) { this.onlineEnabled = onlineEnabled; }

    public boolean isInternationalEnabled() { return internationalEnabled; }
    public void setInternationalEnabled(boolean internationalEnabled) { this.internationalEnabled = internationalEnabled; }

    public boolean isContactlessEnabled() { return contactlessEnabled; }
    public void setContactlessEnabled(boolean contactlessEnabled) { this.contactlessEnabled = contactlessEnabled; }

    public boolean isAtmWithdrawalEnabled() { return atmWithdrawalEnabled; }
    public void setAtmWithdrawalEnabled(boolean atmWithdrawalEnabled) { this.atmWithdrawalEnabled = atmWithdrawalEnabled; }

    public BigDecimal getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(BigDecimal dailyLimit) { this.dailyLimit = dailyLimit; }
}
