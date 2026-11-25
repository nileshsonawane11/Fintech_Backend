package com.fintech.loan.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public class IncomeDetailsDto {

    @NotBlank(message = "employmentType is required")
    private String employmentType;

    @NotNull(message = "monthlyIncome is required")
    @Positive(message = "monthlyIncome must be positive")
    private BigDecimal monthlyIncome;

    private String employerName;

    public String getEmploymentType() { return employmentType; }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }

    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }

    public String getEmployerName() { return employerName; }
    public void setEmployerName(String employerName) { this.employerName = employerName; }
}
