package com.fintech.customer.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record CustomerProfileResponse(
        String customerId,
        String fullName,
        LocalDate dateOfBirth,
        String mobileNumber,
        String email,
        String pan,
        String aadhar,
        String kycStatus,
        String riskCategory,
        Instant createdAt,
        String gender,
        List<CustomerAddressResponse> customerAddress
) {
    public CustomerProfileResponse(
            String customerId,
            String fullName,
            LocalDate dateOfBirth,
            String mobileNumber,
            String email,
            String pan,
            String aadhar,
            String kycStatus,
            String riskCategory,
            Instant createdAt
    ) {
        this(
                customerId,
                fullName,
                dateOfBirth,
                mobileNumber,
                email,
                pan,
                aadhar,
                kycStatus,
                riskCategory,
                createdAt,
                null,
                List.of()
        );
    }
}