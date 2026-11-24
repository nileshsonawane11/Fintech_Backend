package com.fintech.card.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.Map;

@Schema(description = "Request body payload for configuring card channel controls, limits, or ATM PIN")
public class UpdateCardControlsRequest {

    @Schema(description = "Nested map of channel controls (online, atm, international, contactless)", example = "{\"online\": true, \"atm\": false}")
    private Map<String, Object> controls;

    @Schema(description = "Nested map of spending limits (spendDaily, dailySpend, atmDaily, atmWithdrawal)", example = "{\"spendDaily\": 45000, \"atmDaily\": 20000}")
    private Map<String, Object> limits;

    @Schema(description = "Flag to enable or disable online transactions (flat field)", example = "true")
    private Boolean online;

    @Schema(description = "Flag to enable or disable online transactions (canonical alias)", example = "true")
    private Boolean onlineEnabled;

    @Schema(description = "Flag to enable or disable international transactions (flat field)", example = "false")
    private Boolean international;

    @Schema(description = "Flag to enable or disable international transactions (canonical alias)", example = "false")
    private Boolean internationalEnabled;

    @Schema(description = "Flag to enable or disable contactless NFC transactions (flat field)", example = "true")
    private Boolean contactless;

    @Schema(description = "Flag to enable or disable contactless NFC transactions (canonical alias)", example = "true")
    private Boolean contactlessEnabled;

    @Schema(description = "Flag to enable or disable ATM withdrawals (flat field)", example = "true")
    private Boolean atm;

    @Schema(description = "Flag to enable or disable ATM withdrawals (canonical alias)", example = "true")
    private Boolean atmWithdrawalEnabled;

    @Schema(description = "Daily aggregate spend limit in INR (flat field)", example = "50000.00")
    private BigDecimal dailyLimit;

    @Schema(description = "Whether a confidential PIN has been configured", example = "true")
    private Boolean pinSet;

    public Map<String, Object> getControls() { return controls; }
    public void setControls(Map<String, Object> controls) { this.controls = controls; }

    public Map<String, Object> getLimits() { return limits; }
    public void setLimits(Map<String, Object> limits) { this.limits = limits; }

    public Boolean getOnline() { return online; }
    public void setOnline(Boolean online) { this.online = online; }

    public Boolean getOnlineEnabled() { return onlineEnabled; }
    public void setOnlineEnabled(Boolean onlineEnabled) { this.onlineEnabled = onlineEnabled; }

    public Boolean getInternational() { return international; }
    public void setInternational(Boolean international) { this.international = international; }

    public Boolean getInternationalEnabled() { return internationalEnabled; }
    public void setInternationalEnabled(Boolean internationalEnabled) { this.internationalEnabled = internationalEnabled; }

    public Boolean getContactless() { return contactless; }
    public void setContactless(Boolean contactless) { this.contactless = contactless; }

    public Boolean getContactlessEnabled() { return contactlessEnabled; }
    public void setContactlessEnabled(Boolean contactlessEnabled) { this.contactlessEnabled = contactlessEnabled; }

    public Boolean getAtm() { return atm; }
    public void setAtm(Boolean atm) { this.atm = atm; }

    public Boolean getAtmWithdrawalEnabled() { return atmWithdrawalEnabled; }
    public void setAtmWithdrawalEnabled(Boolean atmWithdrawalEnabled) { this.atmWithdrawalEnabled = atmWithdrawalEnabled; }

    public BigDecimal getDailyLimit() { return dailyLimit; }
    public void setDailyLimit(BigDecimal dailyLimit) { this.dailyLimit = dailyLimit; }

    public Boolean getPinSet() { return pinSet; }
    public void setPinSet(Boolean pinSet) { this.pinSet = pinSet; }

    // Resolvers for nested or flat values
    public Boolean resolveOnline() {
        if (online != null) return online;
        if (onlineEnabled != null) return onlineEnabled;
        if (controls != null) {
            Object v = controls.get("online");
            if (v == null) v = controls.get("onlineEnabled");
            if (v instanceof Boolean b) return b;
            if (v != null) return Boolean.parseBoolean(v.toString());
        }
        return null;
    }

    public Boolean resolveInternational() {
        if (international != null) return international;
        if (internationalEnabled != null) return internationalEnabled;
        if (controls != null) {
            Object v = controls.get("international");
            if (v == null) v = controls.get("internationalEnabled");
            if (v instanceof Boolean b) return b;
            if (v != null) return Boolean.parseBoolean(v.toString());
        }
        return null;
    }

    public Boolean resolveContactless() {
        if (contactless != null) return contactless;
        if (contactlessEnabled != null) return contactlessEnabled;
        if (controls != null) {
            Object v = controls.get("contactless");
            if (v == null) v = controls.get("contactlessEnabled");
            if (v instanceof Boolean b) return b;
            if (v != null) return Boolean.parseBoolean(v.toString());
        }
        return null;
    }

    public Boolean resolveAtm() {
        if (atm != null) return atm;
        if (atmWithdrawalEnabled != null) return atmWithdrawalEnabled;
        if (controls != null) {
            Object v = controls.get("atm");
            if (v == null) v = controls.get("atmWithdrawalEnabled");
            if (v instanceof Boolean b) return b;
            if (v != null) return Boolean.parseBoolean(v.toString());
        }
        return null;
    }

    public BigDecimal resolveDailyLimit() {
        if (dailyLimit != null) return dailyLimit;
        if (limits != null) {
            Object spend = limits.get("spendDaily");
            if (spend == null) spend = limits.get("dailySpend");
            if (spend instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
            if (spend != null) return new BigDecimal(spend.toString());
        }
        if (controls != null) {
            Object spend = controls.get("dailyLimit");
            if (spend instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
            if (spend != null) return new BigDecimal(spend.toString());
        }
        return null;
    }

    public BigDecimal resolveAtmDailyLimit() {
        if (limits != null) {
            Object atmVal = limits.get("atmDaily");
            if (atmVal == null) atmVal = limits.get("atmWithdrawal");
            if (atmVal instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
            if (atmVal != null) return new BigDecimal(atmVal.toString());
        }
        return null;
    }
}
