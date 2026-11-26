package com.fintech.loan.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class LoanLifecycleResponses {

    private LoanLifecycleResponses() {
    }

    public record LoanDisbursementResponse(
            String loanApplicationId,
            String loanAccountId,
            String disbursementAccountId,
            BigDecimal principalAmount,
            BigDecimal interestRate,
            Integer tenureMonths,
            BigDecimal emiAmount,
            String currency,
            String status,
            LocalDate disbursementDate,
            LocalDate nextDueDate,
            Instant disbursedAt
    ) {}

    public record SanctionedOfferDetailsResponse(
            String offerId,
            String loanApplicationId,
            BigDecimal sanctionedAmount,
            BigDecimal interestRate,
            Integer tenureMonths,
            BigDecimal estimatedEmi,
            String currency,
            String status,
            String disbursementAccountId,
            Instant expiresAt,
            Instant acceptedAt
    ) {}
}
