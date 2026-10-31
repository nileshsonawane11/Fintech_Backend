package com.fintech.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePermissionRequest(
        @NotBlank(message = "Permission code is required")
        @Size(max = 100, message = "Permission code cannot exceed 100 characters")
        String code,

        @Size(max = 255, message = "Description cannot exceed 255 characters")
        String description,

        @NotBlank(message = "Module is required")
        @Size(max = 100, message = "Module cannot exceed 100 characters")
        String module
) {
}
