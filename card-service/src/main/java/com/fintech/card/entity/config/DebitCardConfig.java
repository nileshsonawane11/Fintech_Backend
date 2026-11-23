package com.fintech.card.entity.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class DebitCardConfig implements Serializable {

    private BigDecimal atmDailyLimit;
    private BigDecimal posDailyLimit;
    private BigDecimal onlineDailyLimit;
    private BigDecimal contactlessTransactionLimit;
    private Integer freeOwnBankAtmWithdrawals;
    private Integer freeOtherBankAtmTransactions;
    private String freeOtherBankAtmLocationType;
    private BigDecimal additionalAtmWithdrawalFee;
    private List<String> feeWaiverCustomerCategories = new ArrayList<>();

    public DebitCardConfig() {
    }

    public BigDecimal getAtmDailyLimit() {
        return atmDailyLimit;
    }

    public void setAtmDailyLimit(BigDecimal atmDailyLimit) {
        this.atmDailyLimit = atmDailyLimit;
    }

    public BigDecimal getPosDailyLimit() {
        return posDailyLimit;
    }

    public void setPosDailyLimit(BigDecimal posDailyLimit) {
        this.posDailyLimit = posDailyLimit;
    }

    public BigDecimal getOnlineDailyLimit() {
        return onlineDailyLimit;
    }

    public void setOnlineDailyLimit(BigDecimal onlineDailyLimit) {
        this.onlineDailyLimit = onlineDailyLimit;
    }

    public BigDecimal getContactlessTransactionLimit() {
        return contactlessTransactionLimit;
    }

    public void setContactlessTransactionLimit(BigDecimal contactlessTransactionLimit) {
        this.contactlessTransactionLimit = contactlessTransactionLimit;
    }

    public Integer getFreeOwnBankAtmWithdrawals() {
        return freeOwnBankAtmWithdrawals;
    }

    public void setFreeOwnBankAtmWithdrawals(Integer freeOwnBankAtmWithdrawals) {
        this.freeOwnBankAtmWithdrawals = freeOwnBankAtmWithdrawals;
    }

    public Integer getFreeOtherBankAtmTransactions() {
        return freeOtherBankAtmTransactions;
    }

    public void setFreeOtherBankAtmTransactions(Integer freeOtherBankAtmTransactions) {
        this.freeOtherBankAtmTransactions = freeOtherBankAtmTransactions;
    }

    public String getFreeOtherBankAtmLocationType() {
        return freeOtherBankAtmLocationType;
    }

    public void setFreeOtherBankAtmLocationType(String freeOtherBankAtmLocationType) {
        this.freeOtherBankAtmLocationType = freeOtherBankAtmLocationType;
    }

    public BigDecimal getAdditionalAtmWithdrawalFee() {
        return additionalAtmWithdrawalFee;
    }

    public void setAdditionalAtmWithdrawalFee(BigDecimal additionalAtmWithdrawalFee) {
        this.additionalAtmWithdrawalFee = additionalAtmWithdrawalFee;
    }

    public List<String> getFeeWaiverCustomerCategories() {
        return feeWaiverCustomerCategories;
    }

    public void setFeeWaiverCustomerCategories(List<String> feeWaiverCustomerCategories) {
        this.feeWaiverCustomerCategories = feeWaiverCustomerCategories != null ? feeWaiverCustomerCategories : new ArrayList<>();
    }
}
