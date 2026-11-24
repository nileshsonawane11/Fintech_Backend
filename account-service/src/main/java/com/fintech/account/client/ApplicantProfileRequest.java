package com.fintech.account.client;

import java.time.LocalDate;

public record ApplicantProfileRequest(
        String identitySubject,
        String fullName,
        LocalDate dateOfBirth,
        String gender,
        String mobileNumber,
        String email,
        String pan,
        String aadhaarNumber,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String country,
        String addressType,
        String occupation,
        String annualIncomeRange
) {}
