package com.fintech.account.dto.request;

import com.fintech.account.enums.NomineeRelationship;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record NomineeRequest(
        @NotBlank(message = "Nominee full name is required")
        @Size(max = 150, message = "Full name must not exceed 150 characters")
        String fullName,

        @NotNull(message = "Relationship is required")
        NomineeRelationship relationship,

        @NotNull(message = "Date of birth is required")
        @Past(message = "Date of birth must be in the past")
        LocalDate dateOfBirth,

        @NotBlank(message = "Mobile number is required")
        @Pattern(regexp = "^[0-9]{10}$", message = "Mobile number must be exactly 10 digits")
        String mobileNumber,

        @Min(value = 1, message = "Allocation percentage must be at least 1%")
        @Max(value = 100, message = "Allocation percentage cannot exceed 100%")
        Integer allocationPercentage
) {}
