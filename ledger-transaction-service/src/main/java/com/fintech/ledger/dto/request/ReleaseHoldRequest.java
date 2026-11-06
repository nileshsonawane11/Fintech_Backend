package com.fintech.ledger.dto.request;

import java.math.BigDecimal;

public record ReleaseHoldRequest(
        String holdId,

        String accountId,

        BigDecimal amount,

        String currency,

        String reasonCode,

        String remarks
) {}
