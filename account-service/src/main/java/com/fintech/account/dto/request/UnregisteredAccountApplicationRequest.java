package com.fintech.account.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UnregisteredAccountApplicationRequest(
        @NotBlank(message = "Product code is required")
        String productCode,

        @NotNull(message = "Initial funding amount is required")
        @DecimalMin(value = "0.00", message = "Initial funding amount cannot be negative")
        BigDecimal initialFundingAmount,

        @NotBlank(message = "Full legal name is required")
        @Size(max = 150, message = "Full name must not exceed 150 characters")
        String fullName,

        @NotNull(message = "Date of birth is required")
        @Past(message = "Date of birth must be in the past")
        LocalDate dateOfBirth,

        @NotBlank(message = "Gender is required")
        @Pattern(regexp = "MALE|FEMALE|OTHER", message = "Gender must be MALE, FEMALE, or OTHER")
        String gender,

        @NotBlank(message = "Mobile number is required")
        @Pattern(regexp = "^[0-9]{10}$", message = "Mobile number must be exactly 10 digits")
        String mobileNumber,

        @NotBlank(message = "Email address is required")
        @Email(message = "Invalid email address format")
        @Size(max = 254, message = "Email is too long")
        String email,

        @NotBlank(message = "Residential street address is required")
        @Size(max = 200, message = "Address line 1 must not exceed 200 characters")
        String addressLine1,

        @Size(max = 200, message = "Address line 2 must not exceed 200 characters")
        String addressLine2,

        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City must not exceed 100 characters")
        String city,

        @NotBlank(message = "State is required")
        @Size(max = 100, message = "State must not exceed 100 characters")
        String state,

        @NotBlank(message = "PIN code is required")
        @Pattern(regexp = "^[0-9]{6}$", message = "PIN code must be exactly 6 digits")
        String postalCode,

        @NotBlank(message = "PAN is required")
        @Pattern(regexp = "[A-Z]{5}[0-9]{4}[A-Z]", message = "Invalid PAN format")
        String pan,

        @NotBlank(message = "Aadhaar number is required")
        String aadhaarNumber,

        @Valid
        NomineeRequest nominee
) {}
