package com.fintech.loan.dto.request;

import jakarta.validation.constraints.NotBlank;

public class AcceptLoanOfferRequest {

    @NotBlank(message = "acceptedTermsVersion is required")
    private String acceptedTermsVersion;

    @NotBlank(message = "disbursementAccountId is required")
    private String disbursementAccountId;

    public String getAcceptedTermsVersion() { return acceptedTermsVersion; }
    public void setAcceptedTermsVersion(String acceptedTermsVersion) { this.acceptedTermsVersion = acceptedTermsVersion; }

    public String getDisbursementAccountId() { return disbursementAccountId; }
    public void setDisbursementAccountId(String disbursementAccountId) { this.disbursementAccountId = disbursementAccountId; }
}
