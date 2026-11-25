package com.fintech.loan.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

public class LoanApplicationRequest {

    @NotBlank(message = "productCode is required")
    private String productCode;

    @NotNull(message = "requestedAmount is required")
    @Positive(message = "requestedAmount must be positive")
    @Digits(integer = 13, fraction = 2, message = "requestedAmount must have at most two decimal places")
    private BigDecimal requestedAmount;

    @NotNull(message = "tenureMonths is required")
    @Positive(message = "tenureMonths must be positive")
    private Integer tenureMonths;

    @Size(max = 100, message = "purpose must not exceed 100 characters")
    private String purpose;

    @NotNull(message = "creditBureauConsent is required")
    private Boolean creditBureauConsent;

    @NotNull(message = "incomeDetails is required")
    @Valid
    private IncomeDetailsDto incomeDetails;

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }

    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public Boolean getCreditBureauConsent() { return creditBureauConsent; }
    public void setCreditBureauConsent(Boolean creditBureauConsent) { this.creditBureauConsent = creditBureauConsent; }

    public IncomeDetailsDto getIncomeDetails() { return incomeDetails; }
    public void setIncomeDetails(IncomeDetailsDto incomeDetails) { this.incomeDetails = incomeDetails; }
}
