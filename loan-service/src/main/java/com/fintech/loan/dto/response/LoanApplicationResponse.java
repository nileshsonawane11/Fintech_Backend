package com.fintech.loan.dto.response;

import com.fintech.loan.dto.response.DynamicOfferResponses.ApplicationOfferSnapshotResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class LoanApplicationResponse {

    private String loanApplicationId;
    private String customerId;
    private String productCode;
    private String status;
    private String creditAssessmentStatus;
    private Instant estimatedDecisionTime;
    private BigDecimal requestedAmount;
    private Integer tenureMonths;
    private String currency;
    private BigDecimal baseInterestRate;
    private BigDecimal effectiveInterestRate;
    private BigDecimal indicativeEmi;
    private BigDecimal calculatedFoir;
    private BigDecimal processingFeeAmount;
    private String disbursementAccountId;
    private String kycStatus;
    private String kycCaseId;
    private String offerId;
    private ApplicationOfferSnapshotResponse appliedOffer;
    private List<LoanDocumentResponse> documents;
    private List<LoanHistoryResponse> history;
    private Instant createdAt;
    private Instant updatedAt;

    public LoanApplicationResponse() {}

    public LoanApplicationResponse(String loanApplicationId, String status,
                                   String creditAssessmentStatus, Instant estimatedDecisionTime) {
        this.loanApplicationId = loanApplicationId;
        this.status = status;
        this.creditAssessmentStatus = creditAssessmentStatus;
        this.estimatedDecisionTime = estimatedDecisionTime;
    }

    public record LoanDocumentResponse(
            String documentType,
            String documentReferenceId,
            String fileName,
            String source,
            String verificationStatus
    ) {}

    public record LoanHistoryResponse(
            String previousStatus,
            String newStatus,
            String changedBy,
            String changedByRole,
            Instant changedAt,
            String remarks,
            String reason
    ) {}

    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getProductCode() { return productCode; }
    public void setProductCode(String productCode) { this.productCode = productCode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreditAssessmentStatus() { return creditAssessmentStatus; }
    public void setCreditAssessmentStatus(String creditAssessmentStatus) { this.creditAssessmentStatus = creditAssessmentStatus; }

    public Instant getEstimatedDecisionTime() { return estimatedDecisionTime; }
    public void setEstimatedDecisionTime(Instant estimatedDecisionTime) { this.estimatedDecisionTime = estimatedDecisionTime; }

    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }

    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getBaseInterestRate() { return baseInterestRate; }
    public void setBaseInterestRate(BigDecimal baseInterestRate) { this.baseInterestRate = baseInterestRate; }

    public BigDecimal getEffectiveInterestRate() { return effectiveInterestRate; }
    public void setEffectiveInterestRate(BigDecimal effectiveInterestRate) { this.effectiveInterestRate = effectiveInterestRate; }

    public BigDecimal getIndicativeEmi() { return indicativeEmi; }
    public void setIndicativeEmi(BigDecimal indicativeEmi) { this.indicativeEmi = indicativeEmi; }

    public BigDecimal getCalculatedFoir() { return calculatedFoir; }
    public void setCalculatedFoir(BigDecimal calculatedFoir) { this.calculatedFoir = calculatedFoir; }

    public BigDecimal getProcessingFeeAmount() { return processingFeeAmount; }
    public void setProcessingFeeAmount(BigDecimal processingFeeAmount) { this.processingFeeAmount = processingFeeAmount; }

    public String getDisbursementAccountId() { return disbursementAccountId; }
    public void setDisbursementAccountId(String disbursementAccountId) { this.disbursementAccountId = disbursementAccountId; }

    public String getKycStatus() { return kycStatus; }
    public void setKycStatus(String kycStatus) { this.kycStatus = kycStatus; }

    public String getKycCaseId() { return kycCaseId; }
    public void setKycCaseId(String kycCaseId) { this.kycCaseId = kycCaseId; }

    public String getOfferId() { return offerId; }
    public void setOfferId(String offerId) { this.offerId = offerId; }

    public ApplicationOfferSnapshotResponse getAppliedOffer() { return appliedOffer; }
    public void setAppliedOffer(ApplicationOfferSnapshotResponse appliedOffer) { this.appliedOffer = appliedOffer; }

    public List<LoanDocumentResponse> getDocuments() { return documents; }
    public void setDocuments(List<LoanDocumentResponse> documents) { this.documents = documents; }

    public List<LoanHistoryResponse> getHistory() { return history; }
    public void setHistory(List<LoanHistoryResponse> history) { this.history = history; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
