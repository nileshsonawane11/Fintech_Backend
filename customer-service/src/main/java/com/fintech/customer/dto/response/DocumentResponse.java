package com.fintech.customer.dto.response;

import java.time.Instant;

public record DocumentResponse(
        String documentReferenceId,
        String documentType,
        String fileName,
        String contentType,
        long contentSizeBytes,
        String status,
        Instant createdAt,
        Instant uploadedAt
) {
}