package com.fintech.identity.dto.response;

import java.time.Instant;
import java.util.UUID;

public record RoleResponse(
        UUID id,
        String name,
        String description,
        Instant createdAt
) {
}
