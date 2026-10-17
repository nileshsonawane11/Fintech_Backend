
package com.fintech.customer.dto.request;

import com.fintech.customer.model.document.DocumentType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;

public record KycApplicationRequest(
        @NotBlank
        @Size(max = 150)
        String fullName,

        @NotNull
        @Past
        LocalDate dateOfBirth,

        @NotBlank
        @Pattern(regexp = "MALE|FEMALE|OTHER")
        String gender,

        @NotBlank
        @Pattern(regexp = "[A-Z]{5}[0-9]{4}[A-Z]")
        String pan,

        @AssertTrue(message = "Required Aadhaar consent must be provided")
        boolean aadhaarConsent,

        @Size(max = 100)
        String ckycNumber,

        @NotBlank
        @Pattern(regexp = "SALARIED|SELF_EMPLOYED|BUSINESS|STUDENT|RETIRED|OTHER")
        String occupation,

        @NotBlank
        @Pattern(regexp = "BELOW_500000|500000_1000000|1000000_2500000|ABOVE_2500000")
        String annualIncomeRange,

        @NotNull
        @Valid
        AddressRequest address,

        @NotEmpty
        @Size(max = 5)
        List<@Valid DocumentReferenceRequest> documentReferences
) {
    public record AddressRequest(
            @NotBlank @Size(max = 200) String addressLine1,
            @Size(max = 200) String addressLine2,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 100) String state,
            @NotBlank @Pattern(regexp = "[0-9]{6}") String postalCode,
            @NotBlank @Pattern(regexp = "INDIA") String country,
            @NotBlank @Pattern(regexp = "CURRENT|PERMANENT") String addressType
    ) {}

    public record DocumentReferenceRequest(
            @NotNull DocumentType documentType,
            @NotBlank @Size(max = 64) String documentReferenceId
    ) {}
}