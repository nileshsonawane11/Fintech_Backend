package com.fintech.account.dto.response;

import com.fintech.account.enums.AccountStatus;
import java.time.Instant;
import java.util.UUID;

public record LifecycleHistoryResponse(
        UUID id,
        String accountId,
        AccountStatus previousStatus,
        AccountStatus newStatus,
        String reasonCode,
        String remarks,
        String changedBy,
        Instant changedAt
) {}
