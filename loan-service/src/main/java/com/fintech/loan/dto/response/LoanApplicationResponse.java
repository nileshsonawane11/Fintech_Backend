package com.fintech.loan.dto.response;

import java.time.Instant;

public class LoanApplicationResponse {

    private String loanApplicationId;
    private String status;
    private String creditAssessmentStatus;
    private Instant estimatedDecisionTime;

    public LoanApplicationResponse() {}

    public LoanApplicationResponse(String loanApplicationId, String status,
                                    String creditAssessmentStatus, Instant estimatedDecisionTime) {
        this.loanApplicationId = loanApplicationId;
        this.status = status;
        this.creditAssessmentStatus = creditAssessmentStatus;
        this.estimatedDecisionTime = estimatedDecisionTime;
    }

    public String getLoanApplicationId() { return loanApplicationId; }
    public void setLoanApplicationId(String loanApplicationId) { this.loanApplicationId = loanApplicationId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreditAssessmentStatus() { return creditAssessmentStatus; }
    public void setCreditAssessmentStatus(String creditAssessmentStatus) { this.creditAssessmentStatus = creditAssessmentStatus; }

    public Instant getEstimatedDecisionTime() { return estimatedDecisionTime; }
    public void setEstimatedDecisionTime(Instant estimatedDecisionTime) { this.estimatedDecisionTime = estimatedDecisionTime; }
}
