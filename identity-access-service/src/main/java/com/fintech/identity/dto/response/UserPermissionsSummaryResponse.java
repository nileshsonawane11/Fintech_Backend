package com.fintech.identity.dto.response;

import java.util.List;
import java.util.UUID;

public record UserPermissionsSummaryResponse(
        UUID userId,
        List<String> assignedRoles,
        List<String> rolePermissions,
        List<UserPermissionResponse> directPermissions,
        List<String> effectivePermissions
) {
}
