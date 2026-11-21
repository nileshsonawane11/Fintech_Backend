package com.fintech.customer.dto.request;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record ApplicantProfileRequest(
        @NotBlank(message = "Identity subject is required")
        String identitySubject,

        @NotBlank(message = "Full legal name is required")
        @Size(max = 150)
        String fullName,

        @NotNull(message = "Date of birth is required")
        @Past(message = "Date of birth must be in the past")
        LocalDate dateOfBirth,

        @NotBlank(message = "Gender is required")
        @Pattern(regexp = "MALE|FEMALE|OTHER")
        String gender,

        @NotBlank(message = "Mobile number is required")
        @Pattern(regexp = "^[0-9]{10}$")
        String mobileNumber,

        @NotBlank(message = "Email is required")
        @Email
        String email,

        @NotBlank(message = "PAN is required")
        @Pattern(regexp = "[A-Z]{5}[0-9]{4}[A-Z]")
        String pan,

        @NotBlank(message = "Aadhaar number is required")
        String aadhaarNumber,

        @NotBlank(message = "Street address is required")
        String addressLine1,

        String addressLine2,

        @NotBlank(message = "City is required")
        String city,

        @NotBlank(message = "State is required")
        String state,

        @NotBlank(message = "PIN code is required")
        @Pattern(regexp = "^[0-9]{6}$")
        String postalCode,

        String country,

        String addressType,

        String occupation,

        String annualIncomeRange
) {
    public String getEffectiveCountry() {
        return (country != null && !country.isBlank()) ? country : "INDIA";
    }

    public String getEffectiveAddressType() {
        return (addressType != null && !addressType.isBlank()) ? addressType : "RESIDENTIAL";
    }

    public String getEffectiveOccupation() {
        return (occupation != null && !occupation.isBlank()) ? occupation : "SALARIED";
    }

    public String getEffectiveAnnualIncomeRange() {
        return (annualIncomeRange != null && !annualIncomeRange.isBlank()) ? annualIncomeRange : "500000_1000000";
    }
}
