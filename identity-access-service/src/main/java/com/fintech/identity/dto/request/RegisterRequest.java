package com.fintech.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank(message = "Mobile number is required")
        @Pattern(
                regexp = "^[0-9]{10}$",
                message = "Mobile number must contain exactly 10 digits"
        )
        String mobileNumber,

        @NotBlank(message = "Email is required")
        @Email(message = "Email format is invalid")
        @Size(max = 254, message = "Email is too long")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 12, max = 72,
                message = "Password must contain between 12 and 72 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).+$",
                message = "Password must contain uppercase, lowercase, digit and special character"
        )
        String password,

        @NotBlank(message = "Accepted terms version is required")
        @Size(max = 100)
        String acceptedTermsVersion,

        boolean marketingConsent
) {
}