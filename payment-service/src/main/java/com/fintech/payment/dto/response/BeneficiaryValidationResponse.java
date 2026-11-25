package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record BeneficiaryValidationResponse(
        String validationId,
        String beneficiaryId,
        String validationMode,
        String status,
        String providerAccountStatus,
        String registeredName,
        BigDecimal nameMatchScore,
        String utr,
        String failureReason,
        String failureDescription,
        Instant initiatedAt,
        Instant completedAt
) {}
