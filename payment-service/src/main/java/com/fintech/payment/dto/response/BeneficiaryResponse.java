package com.fintech.payment.dto.response;

public class BeneficiaryResponse {
    private String beneficiaryId;
    private String status;
    private String maskedAccountNumber;
    private String verificationStatus;

    public BeneficiaryResponse() { }

    public BeneficiaryResponse(String beneficiaryId, String status, String maskedAccountNumber, String verificationStatus) {
        this.beneficiaryId = beneficiaryId;
        this.status = status;
        this.maskedAccountNumber = maskedAccountNumber;
        this.verificationStatus = verificationStatus;
    }

    public String getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(String beneficiaryId) { this.beneficiaryId = beneficiaryId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMaskedAccountNumber() { return maskedAccountNumber; }
    public void setMaskedAccountNumber(String maskedAccountNumber) { this.maskedAccountNumber = maskedAccountNumber; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
}
