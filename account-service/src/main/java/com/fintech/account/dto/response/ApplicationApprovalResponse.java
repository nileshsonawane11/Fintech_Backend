package com.fintech.account.dto.response;

import java.time.Instant;

public record ApplicationApprovalResponse(
        String applicationId,
        String status,
        String accountId,
        String approvedBy,
        Instant approvedAt
) {}
