package com.fintech.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(

        @NotBlank(message = "Identifier is required")
        @Size(max = 254)
        String identifier,

        @NotBlank(message = "Password is required")
        @Size(max = 72)
        String password
) {
}