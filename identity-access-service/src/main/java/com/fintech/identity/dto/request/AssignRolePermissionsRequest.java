package com.fintech.identity.dto.request;

import java.util.List;
import java.util.UUID;

public record AssignRolePermissionsRequest(
        List<UUID> permissionIds,
        List<String> permissionCodes
) {
}
