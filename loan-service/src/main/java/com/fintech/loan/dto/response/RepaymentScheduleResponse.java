package com.fintech.loan.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class RepaymentScheduleResponse {

    private String loanAccountId;
    private String currency;
    private BigDecimal outstandingPrincipal;
    private LocalDate nextDueDate;
    private List<InstallmentDto> installments;

    public RepaymentScheduleResponse() {}

    public RepaymentScheduleResponse(String loanAccountId, String currency,
                                      BigDecimal outstandingPrincipal, LocalDate nextDueDate,
                                      List<InstallmentDto> installments) {
        this.loanAccountId = loanAccountId;
        this.currency = currency;
        this.outstandingPrincipal = outstandingPrincipal;
        this.nextDueDate = nextDueDate;
        this.installments = installments;
    }

    public String getLoanAccountId() { return loanAccountId; }
    public void setLoanAccountId(String loanAccountId) { this.loanAccountId = loanAccountId; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getOutstandingPrincipal() { return outstandingPrincipal; }
    public void setOutstandingPrincipal(BigDecimal outstandingPrincipal) { this.outstandingPrincipal = outstandingPrincipal; }

    public LocalDate getNextDueDate() { return nextDueDate; }
    public void setNextDueDate(LocalDate nextDueDate) { this.nextDueDate = nextDueDate; }

    public List<InstallmentDto> getInstallments() { return installments; }
    public void setInstallments(List<InstallmentDto> installments) { this.installments = installments; }
}
