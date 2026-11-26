package com.fintech.loan.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record LoanAccountResponse(
        String loanAccountId,
        String loanApplicationId,
        String offerId,
        String customerId,
        String productCode,
        String disbursementAccountId,
        BigDecimal principalAmount,
        BigDecimal outstandingPrincipal,
        BigDecimal interestRate,
        Integer tenureMonths,
        String currency,
        BigDecimal emiAmount,
        LocalDate disbursementDate,
        LocalDate nextDueDate,
        String status,
        Instant createdAt
) {
}
