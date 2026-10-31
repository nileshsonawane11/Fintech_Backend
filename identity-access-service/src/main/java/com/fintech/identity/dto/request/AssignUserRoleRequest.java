package com.fintech.identity.dto.request;

import java.util.UUID;

public record AssignUserRoleRequest(
        String roleName,
        UUID roleId
) {
}
