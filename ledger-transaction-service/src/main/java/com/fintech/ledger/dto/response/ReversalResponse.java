package com.fintech.ledger.dto.response;

import java.time.Instant;

public record ReversalResponse(
        String originalTransactionId,
        String reversalTransactionId,
        String status,
        String reasonCode,
        String remarks,
        String reversedBy,
        Instant reversedAt
) {
    public ReversalResponse(String originalTransactionId, String reversalTransactionId, String status, Instant reversedAt) {
        this(originalTransactionId, reversalTransactionId, status, null, null, null, reversedAt);
    }
}
