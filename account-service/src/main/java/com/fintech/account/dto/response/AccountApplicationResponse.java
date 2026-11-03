package com.fintech.account.dto.response;

import com.fintech.account.enums.ApplicationStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record AccountApplicationResponse(
        String accountApplicationId,
        String customerId,
        String productCode,
        ApplicationStatus status,
        Instant estimatedCompletionTime,
        BigDecimal initialFundingAmount,
        String currency,
        Instant submittedAt,
        String rejectionReason
) {
    public static AccountApplicationResponse ofSummary(
            String accountApplicationId,
            String customerId,
            String productCode,
            ApplicationStatus status,
            Instant estimatedCompletionTime) {
        return new AccountApplicationResponse(
                accountApplicationId, customerId, productCode, status, estimatedCompletionTime,
                null, null, null, null
        );
    }
}
