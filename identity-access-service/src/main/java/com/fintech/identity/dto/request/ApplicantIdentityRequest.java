package com.fintech.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ApplicantIdentityRequest(
        @NotBlank(message = "Full legal name is required")
        String fullName,

        @NotBlank(message = "Mobile number is required")
        @Pattern(
                regexp = "^[0-9]{10}$",
                message = "Mobile number must contain exactly 10 digits"
        )
        String mobileNumber,

        @NotBlank(message = "Email is required")
        @Email(message = "Email format is invalid")
        String email
) {}
