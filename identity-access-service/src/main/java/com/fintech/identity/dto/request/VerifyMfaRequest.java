package com.fintech.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyMfaRequest(

        @NotBlank(message = "MFA reference ID is required")
        String mfaReferenceId,

        @NotBlank(message = "OTP is required")
        @Pattern(regexp = "^[0-9]{6}$",
                message = "OTP must contain exactly 6 digits")
        String otp
) {
}