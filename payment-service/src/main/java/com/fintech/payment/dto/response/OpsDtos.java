package com.fintech.payment.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OpsDtos {

    private OpsDtos() {}

    public record PagedResponse<T>(
            List<T> items,
            int page,
            int size,
            long totalElements,
            boolean hasNext
    ) {}

    public record ReconciliationRecordResponse(
            String reconciliationId,
            String runId,
            String targetType,
            String targetId,
            String providerRef,
            String internalStatus,
            String providerStatus,
            BigDecimal expectedAmount,
            BigDecimal providerAmount,
            String discrepancyType,
            String resolutionStatus,
            String notes,
            String resolvedBy,
            Instant createdAt,
            Instant resolvedAt
    ) {}

    public record ReconciliationRunSummaryResponse(
            String runId,
            int outgoingChecked,
            int incomingChecked,
            int validationsChecked,
            int mismatchesDetected,
            int autoResolvedCount,
            Instant completedAt
    ) {}

    public record AuditLogResponse(
            String id,
            String actorId,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            String correlationId,
            String details,
            Instant createdAt
    ) {}
}
