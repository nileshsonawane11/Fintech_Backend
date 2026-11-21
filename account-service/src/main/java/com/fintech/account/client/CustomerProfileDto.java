package com.fintech.account.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CustomerProfileDto(
        String customerId,
        String fullName,
        LocalDate dateOfBirth,
        String mobileNumber,
        String email,
        String pan,
        String kycStatus,
        String riskCategory,
        String gender
) {
    public CustomerProfileDto(
            String customerId,
            String fullName,
            LocalDate dateOfBirth,
            String mobileNumber,
            String email,
            String pan,
            String kycStatus,
            String riskCategory
    ) {
        this(customerId, fullName, dateOfBirth, mobileNumber, email, pan, kycStatus, riskCategory, null);
    }
}
