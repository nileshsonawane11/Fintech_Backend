package com.fintech.ledger.dto.response;

import com.fintech.ledger.enums.DiscrepancyStatus;
import com.fintech.ledger.enums.DiscrepancyType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record DiscrepancyResponse(
        UUID discrepancyId,
        String reconciliationId,
        String accountId,
        DiscrepancyType discrepancyType,
        BigDecimal expectedAmount,
        BigDecimal actualAmount,
        BigDecimal differenceAmount,
        String description,
        DiscrepancyStatus status,
        Instant createdAt,
        Instant resolvedAt,
        String resolvedBy
) {}
