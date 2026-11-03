package com.fintech.account.dto.response;

import com.fintech.account.enums.AccountStatus;
import java.time.Instant;

public record AccountStatusResponse(
        String accountId,
        AccountStatus status,
        Instant updatedAt
) {}
