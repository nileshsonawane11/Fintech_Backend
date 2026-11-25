package com.fintech.loan.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "loan_products")
public class LoanProduct {

    @Id
    @Column(name = "product_code", nullable = false, length = 50)
    private String productCode;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(name = "loan_type", nullable = false, length = 50)
    private String loanType;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "min_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "max_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "min_tenure_months", nullable = false)
    private Integer minTenureMonths;

    @Column(name = "max_tenure_months", nullable = false)
    private Integer maxTenureMonths;

    @Column(name = "interest_rate_from", nullable = false, precision = 5, scale = 2)
    private BigDecimal interestRateFrom;

    @Column(name = "interest_type", nullable = false, length = 20)
    private String interestType;

    @Column(name = "secured", nullable = false)
    private Boolean secured;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public LoanProduct() {}

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

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
