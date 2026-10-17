package com.fintech.customer.dto.response;

import java.time.Instant;

public record DocumentUploadResponse(
        String documentReferenceId,
        String uploadUrl,
        Instant expiresAt,
        String method,
        String contentType,
        String status
) {
}