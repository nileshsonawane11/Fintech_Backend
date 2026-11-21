package com.fintech.customer.dto.response;

import java.time.Instant;
import java.time.LocalDate;

public record CustomerProfileResponse(
        String customerId,
        String fullName,
        LocalDate dateOfBirth,
        String mobileNumber,
        String email,
        String pan,
        String kycStatus,
        String riskCategory,
        Instant createdAt,
        String gender
) {
    public CustomerProfileResponse(
            String customerId,
            String fullName,
            LocalDate dateOfBirth,
            String mobileNumber,
            String email,
            String pan,
            String kycStatus,
            String riskCategory,
            Instant createdAt
    ) {
        this(customerId, fullName, dateOfBirth, mobileNumber, email, pan, kycStatus, riskCategory, createdAt, null);
    }
}