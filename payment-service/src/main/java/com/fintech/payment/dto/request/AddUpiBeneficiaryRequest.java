package com.fintech.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AddUpiBeneficiaryRequest(
        @NotBlank(message = "UPI VPA is required")
        @Pattern(regexp = "^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$", message = "Invalid UPI VPA format")
        String vpa,

        @NotBlank(message = "Beneficiary name is required")
        @Size(max = 100, message = "Beneficiary name must not exceed 100 characters")
        String beneficiaryName,

        @NotBlank(message = "Nickname is required")
        @Size(max = 50, message = "Nickname must not exceed 50 characters")
        String nickname,

        @Size(max = 100, message = "Relationship must not exceed 100 characters")
        String relationship,

        @Size(max = 255, message = "Description must not exceed 255 characters")
        String description
) {}
