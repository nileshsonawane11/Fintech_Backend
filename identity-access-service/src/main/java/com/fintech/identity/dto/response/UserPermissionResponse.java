package com.fintech.identity.dto.response;

import java.time.Instant;
import java.util.UUID;

public record UserPermissionResponse(
        UUID userId,
        UUID permissionId,
        String permissionCode,
        String effect,
        UUID assignedBy,
        Instant assignedAt
) {
}
