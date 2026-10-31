package com.fintech.identity.dto.response;

import java.time.Instant;
import java.util.UUID;

public record PermissionResponse(
        UUID id,
        String code,
        String description,
        String module,
        Instant createdAt,
        Instant updatedAt
) {
}
