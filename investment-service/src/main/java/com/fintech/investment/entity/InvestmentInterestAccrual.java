package com.fintech.investment.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "investment_interest_accruals")
public class InvestmentInterestAccrual {

    @Id
    private UUID id;

    @Column(name = "investment_id", nullable = false, length = 50)
    private String investmentId;

    @Column(name = "accrual_date", nullable = false)
    private LocalDate accrualDate;

    @Column(name = "principal_base", nullable = false, precision = 19, scale = 2)
    private BigDecimal principalBase;

    @Column(name = "rate_applied", nullable = false, precision = 7, scale = 4)
    private BigDecimal rateApplied;

    @Column(name = "interest_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal interestAmount;

    @Column(name = "cumulative_interest", nullable = false, precision = 19, scale = 2)
    private BigDecimal cumulativeInterest;

    @Column(name = "is_illustrative", nullable = false)
    private boolean illustrative = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getInvestmentId() { return investmentId; }
    public void setInvestmentId(String investmentId) { this.investmentId = investmentId; }
    public LocalDate getAccrualDate() { return accrualDate; }
    public void setAccrualDate(LocalDate accrualDate) { this.accrualDate = accrualDate; }
    public BigDecimal getPrincipalBase() { return principalBase; }
    public void setPrincipalBase(BigDecimal principalBase) { this.principalBase = principalBase; }
    public BigDecimal getRateApplied() { return rateApplied; }
    public void setRateApplied(BigDecimal rateApplied) { this.rateApplied = rateApplied; }
    public BigDecimal getInterestAmount() { return interestAmount; }
    public void setInterestAmount(BigDecimal interestAmount) { this.interestAmount = interestAmount; }
    public BigDecimal getCumulativeInterest() { return cumulativeInterest; }
    public void setCumulativeInterest(BigDecimal cumulativeInterest) { this.cumulativeInterest = cumulativeInterest; }
    public boolean isIllustrative() { return illustrative; }
    public void setIllustrative(boolean illustrative) { this.illustrative = illustrative; }
    public Instant getCreatedAt() { return createdAt; }
}
