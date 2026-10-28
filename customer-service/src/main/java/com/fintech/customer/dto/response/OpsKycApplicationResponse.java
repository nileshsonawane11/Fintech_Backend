package com.fintech.customer.dto.response;

import java.time.Instant;

public record OpsKycApplicationResponse(
        String kycCaseId,
        String customerId,
        String fullName,
        String status,
        String riskCategory,
        String occupation,
        String annualIncomeRange,
        boolean aadhaarConsent,
        Instant submittedAt
) {}
