package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public class BeneficiaryResponse {
    private String beneficiaryId;
    private String beneficiaryType;
    private String nickname;
    private String beneficiaryName;
    private String status;
    private String maskedAccountNumber;
    private String maskedVpa;
    private String ifscCode;
    private String bankName;
    private String verificationStatus;
    private String validatedAccountName;
    private BigDecimal nameMatchScore;
    private Instant createdAt;

    public BeneficiaryResponse() { }

    public BeneficiaryResponse(String beneficiaryId, String status, String maskedAccountNumber, String verificationStatus) {
        this.beneficiaryId = beneficiaryId;
        this.status = status;
        this.maskedAccountNumber = maskedAccountNumber;
        this.verificationStatus = verificationStatus;
    }

    public String getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(String beneficiaryId) { this.beneficiaryId = beneficiaryId; }
    public String getBeneficiaryType() { return beneficiaryType; }
    public void setBeneficiaryType(String beneficiaryType) { this.beneficiaryType = beneficiaryType; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getBeneficiaryName() { return beneficiaryName; }
    public void setBeneficiaryName(String beneficiaryName) { this.beneficiaryName = beneficiaryName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMaskedAccountNumber() { return maskedAccountNumber; }
    public void setMaskedAccountNumber(String maskedAccountNumber) { this.maskedAccountNumber = maskedAccountNumber; }
    public String getMaskedVpa() { return maskedVpa; }
    public void setMaskedVpa(String maskedVpa) { this.maskedVpa = maskedVpa; }
    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public String getValidatedAccountName() { return validatedAccountName; }
    public void setValidatedAccountName(String validatedAccountName) { this.validatedAccountName = validatedAccountName; }
    public BigDecimal getNameMatchScore() { return nameMatchScore; }
    public void setNameMatchScore(BigDecimal nameMatchScore) { this.nameMatchScore = nameMatchScore; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
