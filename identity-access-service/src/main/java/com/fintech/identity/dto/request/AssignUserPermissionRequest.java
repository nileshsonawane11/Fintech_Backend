package com.fintech.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record AssignUserPermissionRequest(
        String permissionCode,
        UUID permissionId,

        @NotBlank(message = "Effect is required")
        @Pattern(regexp = "^(ALLOW|DENY)$", message = "Effect must be either ALLOW or DENY")
        String effect
) {
}
