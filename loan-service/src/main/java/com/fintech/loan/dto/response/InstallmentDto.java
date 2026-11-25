package com.fintech.loan.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public class InstallmentDto {

    private String installmentId;
    private Integer installmentNumber;
    private LocalDate dueDate;
    private BigDecimal principalAmount;
    private BigDecimal interestAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private String status;

    public InstallmentDto() {}

    public InstallmentDto(String installmentId, Integer installmentNumber, LocalDate dueDate,
                           BigDecimal principalAmount, BigDecimal interestAmount,
                           BigDecimal totalAmount, BigDecimal paidAmount, String status) {
        this.installmentId = installmentId;
        this.installmentNumber = installmentNumber;
        this.dueDate = dueDate;
        this.principalAmount = principalAmount;
        this.interestAmount = interestAmount;
        this.totalAmount = totalAmount;
        this.paidAmount = paidAmount;
        this.status = status;
    }

    public String getInstallmentId() { return installmentId; }
    public void setInstallmentId(String installmentId) { this.installmentId = installmentId; }

    public Integer getInstallmentNumber() { return installmentNumber; }
    public void setInstallmentNumber(Integer installmentNumber) { this.installmentNumber = installmentNumber; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }

    public BigDecimal getInterestAmount() { return interestAmount; }
    public void setInterestAmount(BigDecimal interestAmount) { this.interestAmount = interestAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
