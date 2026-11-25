package com.fintech.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PasswordChangedRequest(

        @NotBlank(message = "Current password is required")
        String currentPassword,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 25,
                message = "Password must contain between 8 and 25 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).+$",
                message = "Password must contain uppercase, lowercase, digit and special character"
        )
        String newPassword,

        @NotBlank(message = "Confirm password is required")
        String confirmPassword

) {
}