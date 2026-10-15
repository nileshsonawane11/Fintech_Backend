package com.fintech.identity.dto.request;

import com.fintech.identity.model.enums.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;

public record VerifyOtpRequest(

        @NotBlank(message = "Reference ID is required")
        String referenceId,

        @NotBlank(message = "OTP is required")
        @Pattern(regexp = "^[0-9]{6}$",
                message = "OTP must contain exactly 6 digits")
        String otp,

        @NotNull(message = "OTP purpose is required")
        OtpPurpose purpose
) {
}
