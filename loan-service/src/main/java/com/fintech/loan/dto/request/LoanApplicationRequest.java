package com.fintech.loan.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fintech.loan.enums.EmploymentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Map;

public class LoanApplicationRequest {

    @NotBlank(message = "productCode is required")
    private String productCode;

    private EmploymentType employmentType;

    @Size(max = 200, message = "employerOrBusinessName must not exceed 200 characters")
    private String employerOrBusinessName;

    @DecimalMin(value = "0.00", message = "monthlyIncome cannot be negative")
    @Digits(integer = 13, fraction = 2, message = "monthlyIncome must have at most two decimal places")
    private BigDecimal monthlyIncome;

    @DecimalMin(value = "0.00", message = "existingMonthlyEMIs cannot be negative")
    @Digits(integer = 13, fraction = 2, message = "existingMonthlyEMIs must have at most two decimal places")
    private BigDecimal existingMonthlyEMIs;

    @JsonAlias("requestedAmount")
    @Positive(message = "requestedLoanAmount must be positive")
    @Digits(integer = 13, fraction = 2, message = "requestedLoanAmount must have at most two decimal places")
    private BigDecimal requestedLoanAmount;

    @Positive(message = "requestedAmount must be positive")
    @Digits(integer = 13, fraction = 2, message = "requestedAmount must have at most two decimal places")
    private BigDecimal requestedAmount;

    @Positive(message = "tenureMonths must be positive")
    private Integer tenureMonths;

    private String disbursementAccountNumber;

    private String disbursementAccountId;

    @Size(max = 100, message = "loanPurpose must not exceed 100 characters")
    private String loanPurpose;

    @Size(max = 100, message = "purpose must not exceed 100 characters")
    private String purpose;

    @DecimalMin(value = "0.00", message = "collateralValue cannot be negative")
    private BigDecimal collateralValue;

    private Boolean creditBureauConsent;

    @Valid
    private IncomeDetailsDto incomeDetails;

    private Map<String, Object> additionalDetails;

    public BigDecimal getEffectiveRequestedAmount() {
        return requestedLoanAmount != null ? requestedLoanAmount : requestedAmount;
    }

    public String getEffectiveLoanPurpose() {
        if (loanPurpose != null && !loanPurpose.isBlank()) return loanPurpose.trim();
        if (purpose != null && !purpose.isBlank()) return purpose.trim();
        return null;
    }

    public String getEffectiveEmploymentType() {
        if (employmentType != null) return employmentType.name();
        if (incomeDetails != null && incomeDetails.getEmploymentType() != null) {
            return incomeDetails.getEmploymentType().trim().toUpperCase();
        }
        return null;
    }

    public BigDecimal getEffectiveMonthlyIncome() {
        if (monthlyIncome != null) return monthlyIncome;
        if (incomeDetails != null) return incomeDetails.getMonthlyIncome();
        return null;
    }

    public String getEffectiveEmployerName() {
        if (employerOrBusinessName != null && !employerOrBusinessName.isBlank()) {
            return employerOrBusinessName.trim();
        }
        if (incomeDetails != null && incomeDetails.getEmployerName() != null) {
            return incomeDetails.getEmployerName().trim();
        }
        return null;
    }

    public String getEffectiveDisbursementAccountIdentifier() {
        if (disbursementAccountId != null && !disbursementAccountId.isBlank()) {
            return disbursementAccountId.trim();
        }
        if (disbursementAccountNumber != null && !disbursementAccountNumber.isBlank()) {
            return disbursementAccountNumber.trim();
        }
        return null;
    }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public EmploymentType getEmploymentType() { return employmentType; }
    public void setEmploymentType(EmploymentType employmentType) { this.employmentType = employmentType; }

    public String getEmployerOrBusinessName() { return employerOrBusinessName; }
    public void setEmployerOrBusinessName(String employerOrBusinessName) { this.employerOrBusinessName = employerOrBusinessName; }

    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }

    public BigDecimal getExistingMonthlyEMIs() { return existingMonthlyEMIs; }
    public void setExistingMonthlyEMIs(BigDecimal existingMonthlyEMIs) { this.existingMonthlyEMIs = existingMonthlyEMIs; }

    public BigDecimal getRequestedLoanAmount() { return requestedLoanAmount; }
    public void setRequestedLoanAmount(BigDecimal requestedLoanAmount) { this.requestedLoanAmount = requestedLoanAmount; }

    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }

    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }

    public String getDisbursementAccountNumber() { return disbursementAccountNumber; }
    public void setDisbursementAccountNumber(String disbursementAccountNumber) { this.disbursementAccountNumber = disbursementAccountNumber; }

    public String getDisbursementAccountId() { return disbursementAccountId; }
    public void setDisbursementAccountId(String disbursementAccountId) { this.disbursementAccountId = disbursementAccountId; }

    public String getLoanPurpose() { return loanPurpose; }
    public void setLoanPurpose(String loanPurpose) { this.loanPurpose = loanPurpose; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public BigDecimal getCollateralValue() { return collateralValue; }
    public void setCollateralValue(BigDecimal collateralValue) { this.collateralValue = collateralValue; }

    public Boolean getCreditBureauConsent() { return creditBureauConsent; }
    public void setCreditBureauConsent(Boolean creditBureauConsent) { this.creditBureauConsent = creditBureauConsent; }

    public IncomeDetailsDto getIncomeDetails() { return incomeDetails; }
    public void setIncomeDetails(IncomeDetailsDto incomeDetails) { this.incomeDetails = incomeDetails; }

    public Map<String, Object> getAdditionalDetails() { return additionalDetails; }
    public void setAdditionalDetails(Map<String, Object> additionalDetails) { this.additionalDetails = additionalDetails; }
}
