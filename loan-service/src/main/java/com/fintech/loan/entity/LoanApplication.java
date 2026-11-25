package com.fintech.loan.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_applications")
public class LoanApplication {

    @Id
    @Column(name = "id", nullable = false, length = 36)
    private String id = UUID.randomUUID().toString();

    @Column(name = "loan_application_id", nullable = false, length = 50, unique = true)
    private String loanApplicationId;

    @Column(name = "customer_id", nullable = false, length = 100)
    private String customerId;

    @Column(name = "product_code", nullable = false, length = 50)
    private String productCode;

    @Column(name = "requested_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "tenure_months", nullable = false)
    private Integer tenureMonths;

    @Column(name = "purpose", length = 100)
    private String purpose;

    @Column(name = "credit_bureau_consent", nullable = false)
    private Boolean creditBureauConsent;

    @Column(name = "employment_type", length = 50)
    private String employmentType;

    @Column(name = "monthly_income", precision = 15, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(name = "employer_name", length = 200)
    private String employerName;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "credit_assessment_status", nullable = false, length = 50)
    private String creditAssessmentStatus;

    @Column(name = "estimated_decision_time")
    private Instant estimatedDecisionTime;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public LoanApplication() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

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

    public String getEmploymentType() { return employmentType; }
    public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }

    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }

    public String getEmployerName() { return employerName; }
    public void setEmployerName(String employerName) { this.employerName = employerName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreditAssessmentStatus() { return creditAssessmentStatus; }
    public void setCreditAssessmentStatus(String creditAssessmentStatus) { this.creditAssessmentStatus = creditAssessmentStatus; }

    public Instant getEstimatedDecisionTime() { return estimatedDecisionTime; }
    public void setEstimatedDecisionTime(Instant estimatedDecisionTime) { this.estimatedDecisionTime = estimatedDecisionTime; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
