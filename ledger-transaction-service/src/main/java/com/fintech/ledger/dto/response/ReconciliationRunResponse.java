package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.ReconciliationStatus;
import com.fintech.ledger.enums.ReconciliationType;

import java.math.BigDecimal;
import java.time.Instant;

public record ReconciliationRunResponse(
        String reconciliationId,
        ReconciliationType reconciliationType,
        ReconciliationStatus status,
        Integer totalAccounts,
        Integer matchedAccounts,
        Integer mismatchedAccounts,
        BigDecimal differenceAmount,
        String initiatedBy,
        String summary,
        Instant startedAt,
        Instant completedAt
) {
    public ReconciliationRunResponse(String reconciliationId, ReconciliationStatus status, Instant startedAt) {
        this(reconciliationId, ReconciliationType.LEDGER_BALANCE, status, 0, 0, 0, BigDecimal.ZERO, null, null, startedAt, null);
    }
}
