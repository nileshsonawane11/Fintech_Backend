package com.fintech.payment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class InitiateTransferRequest {
    @NotBlank(message = "Debit account ID is required")
    @Size(max = 50, message = "Debit account ID must not exceed 50 characters")
    private String debitAccountId;

    @NotBlank(message = "Beneficiary ID is required")
    @Size(max = 50, message = "Beneficiary ID must not exceed 50 characters")
    private String beneficiaryId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @Digits(integer = 15, fraction = 4, message = "Amount format is invalid")
    private BigDecimal amount;

    @NotBlank(message = "Currency is required")
    @Pattern(regexp = "^INR$", message = "Only INR transfers are currently supported")
    private String currency;

    @Size(max = 255, message = "Remarks must not exceed 255 characters")
    private String remarks;

    @NotBlank(message = "Transfer mode is required")
    @Pattern(regexp = "^(NEFT|IMPS|RTGS|UPI)$", message = "Unsupported transfer mode")
    private String transferMode;

    public String getDebitAccountId() { return debitAccountId; }
    public void setDebitAccountId(String debitAccountId) { this.debitAccountId = debitAccountId; }
    public String getBeneficiaryId() { return beneficiaryId; }
    public void setBeneficiaryId(String beneficiaryId) { this.beneficiaryId = beneficiaryId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public String getTransferMode() { return transferMode; }
    public void setTransferMode(String transferMode) { this.transferMode = transferMode; }
}
