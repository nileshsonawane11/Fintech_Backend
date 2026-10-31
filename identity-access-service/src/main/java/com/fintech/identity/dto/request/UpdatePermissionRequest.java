package com.fintech.identity.dto.request;

import jakarta.validation.constraints.Size;

public record UpdatePermissionRequest(
        @Size(max = 255, message = "Description cannot exceed 255 characters")
        String description,

        @Size(max = 100, message = "Module cannot exceed 100 characters")
        String module
) {
}
