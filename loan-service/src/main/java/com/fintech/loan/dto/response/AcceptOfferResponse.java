package com.fintech.loan.dto.response;

import java.math.BigDecimal;

public class AcceptOfferResponse {

    private String loanApplicationId;
    private String offerId;
    private String status;
    private BigDecimal sanctionedAmount;
    private BigDecimal interestRate;
    private Integer tenureMonths;
    private BigDecimal monthlyEmi;

    public AcceptOfferResponse() {}

    public AcceptOfferResponse(String loanApplicationId, String offerId, String status,
                                BigDecimal sanctionedAmount, BigDecimal interestRate,
                                Integer tenureMonths, BigDecimal monthlyEmi) {
        this.loanApplicationId = loanApplicationId;
        this.offerId = offerId;
        this.status = status;
        this.sanctionedAmount = sanctionedAmount;
        this.interestRate = interestRate;
        this.tenureMonths = tenureMonths;
        this.monthlyEmi = monthlyEmi;
    }

    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }

    public String getOfferId() { return offerId; }
    public void setOfferId(String offerId) { this.offerId = offerId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getSanctionedAmount() { return sanctionedAmount; }
    public void setSanctionedAmount(BigDecimal sanctionedAmount) { this.sanctionedAmount = sanctionedAmount; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }

    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }

    public BigDecimal getMonthlyEmi() { return monthlyEmi; }
    public void setMonthlyEmi(BigDecimal monthlyEmi) { this.monthlyEmi = monthlyEmi; }
}
