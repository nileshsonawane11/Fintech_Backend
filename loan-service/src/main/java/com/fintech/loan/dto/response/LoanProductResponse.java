package com.fintech.loan.dto.response;

import java.math.BigDecimal;

public class LoanProductResponse {

    private String productCode;
    private String productName;
    private String loanType;
    private String currency;
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    private Integer minTenureMonths;
    private Integer maxTenureMonths;
    private BigDecimal interestRateFrom;
    private String interestType;
    private Boolean secured;

    public LoanProductResponse() {}

    public LoanProductResponse(String productCode, String productName, String loanType,
                                String currency, BigDecimal minAmount, BigDecimal maxAmount,
                                Integer minTenureMonths, Integer maxTenureMonths,
                                BigDecimal interestRateFrom, String interestType, Boolean secured) {
        this.productCode = productCode;
        this.productName = productName;
        this.loanType = loanType;
        this.currency = currency;
        this.minAmount = minAmount;
        this.maxAmount = maxAmount;
        this.minTenureMonths = minTenureMonths;
        this.maxTenureMonths = maxTenureMonths;
        this.interestRateFrom = interestRateFrom;
        this.interestType = interestType;
        this.secured = secured;
    }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getLoanType() { return loanType; }
    public void setLoanType(String loanType) { this.loanType = loanType; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getMinAmount() { return minAmount; }
    public void setMinAmount(BigDecimal minAmount) { this.minAmount = minAmount; }

    public BigDecimal getMaxAmount() { return maxAmount; }
    public void setMaxAmount(BigDecimal maxAmount) { this.maxAmount = maxAmount; }

    public Integer getMinTenureMonths() { return minTenureMonths; }
    public void setMinTenureMonths(Integer minTenureMonths) { this.minTenureMonths = minTenureMonths; }

    public Integer getMaxTenureMonths() { return maxTenureMonths; }
    public void setMaxTenureMonths(Integer maxTenureMonths) { this.maxTenureMonths = maxTenureMonths; }

    public BigDecimal getInterestRateFrom() { return interestRateFrom; }
    public void setInterestRateFrom(BigDecimal interestRateFrom) { this.interestRateFrom = interestRateFrom; }

    public String getInterestType() { return interestType; }
    public void setInterestType(String interestType) { this.interestType = interestType; }

    public Boolean getSecured() { return secured; }
    public void setSecured(Boolean secured) { this.secured = secured; }
}
