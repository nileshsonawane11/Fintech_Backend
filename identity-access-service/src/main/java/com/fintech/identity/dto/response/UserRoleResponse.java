package com.fintech.identity.dto.response;

import java.time.Instant;
import java.util.UUID;

public record UserRoleResponse(
        UUID userId,
        UUID roleId,
        String roleName,
        UUID assignedBy,
        Instant assignedAt
) {
}
