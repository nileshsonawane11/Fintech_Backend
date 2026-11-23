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
public class CreditCardConfig implements Serializable {

    private BigDecimal creditLimitMin;
    private BigDecimal creditLimitMax;
    private Integer interestFreePeriodDays;
    private BigDecimal financeChargeMonthlyPercentage;
    private BigDecimal financeChargeApr;
    private BigDecimal atmDailyLimit;
    private BigDecimal posDailyLimit;
    private BigDecimal onlineDailyLimit;
    private BigDecimal cashbackOnlinePercentage;
    private BigDecimal cashbackOnlineMonthlyCap;
    private BigDecimal cashbackOtherPercentage;
    private String cashbackCreditMethod;
    private BigDecimal annualFeeWaiverSpendThreshold;
    private List<LatePaymentChargeSlab> latePaymentChargeSlabs = new ArrayList<>();
    private BigDecimal cashAdvanceFeePercentage;
    private BigDecimal cashAdvanceMinimumFee;
    private BigDecimal overLimitCharge;
    private BigDecimal replacementFee;

    public CreditCardConfig() {
    }

    public BigDecimal getCreditLimitMin() {
        return creditLimitMin;
    }

    public void setCreditLimitMin(BigDecimal creditLimitMin) {
        this.creditLimitMin = creditLimitMin;
    }

    public BigDecimal getCreditLimitMax() {
        return creditLimitMax;
    }

    public void setCreditLimitMax(BigDecimal creditLimitMax) {
        this.creditLimitMax = creditLimitMax;
    }

    public Integer getInterestFreePeriodDays() {
        return interestFreePeriodDays;
    }

    public void setInterestFreePeriodDays(Integer interestFreePeriodDays) {
        this.interestFreePeriodDays = interestFreePeriodDays;
    }

    public BigDecimal getFinanceChargeMonthlyPercentage() {
        return financeChargeMonthlyPercentage;
    }

    public void setFinanceChargeMonthlyPercentage(BigDecimal financeChargeMonthlyPercentage) {
        this.financeChargeMonthlyPercentage = financeChargeMonthlyPercentage;
    }

    public BigDecimal getFinanceChargeApr() {
        return financeChargeApr;
    }

    public void setFinanceChargeApr(BigDecimal financeChargeApr) {
        this.financeChargeApr = financeChargeApr;
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

    public BigDecimal getCashbackOnlinePercentage() {
        return cashbackOnlinePercentage;
    }

    public void setCashbackOnlinePercentage(BigDecimal cashbackOnlinePercentage) {
        this.cashbackOnlinePercentage = cashbackOnlinePercentage;
    }

    public BigDecimal getCashbackOnlineMonthlyCap() {
        return cashbackOnlineMonthlyCap;
    }

    public void setCashbackOnlineMonthlyCap(BigDecimal cashbackOnlineMonthlyCap) {
        this.cashbackOnlineMonthlyCap = cashbackOnlineMonthlyCap;
    }

    public BigDecimal getCashbackOtherPercentage() {
        return cashbackOtherPercentage;
    }

    public void setCashbackOtherPercentage(BigDecimal cashbackOtherPercentage) {
        this.cashbackOtherPercentage = cashbackOtherPercentage;
    }

    public String getCashbackCreditMethod() {
        return cashbackCreditMethod;
    }

    public void setCashbackCreditMethod(String cashbackCreditMethod) {
        this.cashbackCreditMethod = cashbackCreditMethod;
    }

    public BigDecimal getAnnualFeeWaiverSpendThreshold() {
        return annualFeeWaiverSpendThreshold;
    }

    public void setAnnualFeeWaiverSpendThreshold(BigDecimal annualFeeWaiverSpendThreshold) {
        this.annualFeeWaiverSpendThreshold = annualFeeWaiverSpendThreshold;
    }

    public List<LatePaymentChargeSlab> getLatePaymentChargeSlabs() {
        return latePaymentChargeSlabs;
    }

    public void setLatePaymentChargeSlabs(List<LatePaymentChargeSlab> latePaymentChargeSlabs) {
        this.latePaymentChargeSlabs = latePaymentChargeSlabs != null ? latePaymentChargeSlabs : new ArrayList<>();
    }

    public BigDecimal getCashAdvanceFeePercentage() {
        return cashAdvanceFeePercentage;
    }

    public void setCashAdvanceFeePercentage(BigDecimal cashAdvanceFeePercentage) {
        this.cashAdvanceFeePercentage = cashAdvanceFeePercentage;
    }

    public BigDecimal getCashAdvanceMinimumFee() {
        return cashAdvanceMinimumFee;
    }

    public void setCashAdvanceMinimumFee(BigDecimal cashAdvanceMinimumFee) {
        this.cashAdvanceMinimumFee = cashAdvanceMinimumFee;
    }

    public BigDecimal getOverLimitCharge() {
        return overLimitCharge;
    }

    public void setOverLimitCharge(BigDecimal overLimitCharge) {
        this.overLimitCharge = overLimitCharge;
    }

    public BigDecimal getReplacementFee() {
        return replacementFee;
    }

    public void setReplacementFee(BigDecimal replacementFee) {
        this.replacementFee = replacementFee;
    }
}
