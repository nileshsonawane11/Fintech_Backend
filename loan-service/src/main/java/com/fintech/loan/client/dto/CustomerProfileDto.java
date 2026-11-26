package com.fintech.loan.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CustomerProfileDto(
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
        List<CustomerAddressDto> customerAddress
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CustomerAddressDto(
            String id,
            String addressType,
            String addressLine1,
            String addressLine2,
            String city,
            String state,
            String postalCode,
            String country,
            String status,
            boolean deliverable
    ) {}
}
