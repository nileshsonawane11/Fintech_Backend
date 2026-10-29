package com.fintech.customer.dto.response;

import java.time.Instant;

public record KycApprovalResponse(
        String kycCaseId,
        String customerId,
        String status,
        String riskCategory,
        String approvedBy,
        Instant approvedAt
) {}
