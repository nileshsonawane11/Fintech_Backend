
package com.fintech.customer.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record KycApplicationDetailsResponse(

        UUID id,
        String kycCaseId,
        String customerId,
        String customerName,

        String status,
        String riskCategory,
        String occupation,
        String annualIncomeRange,

        Instant submittedAt,

        CustomerDetails customer,

        List<DocumentDetails> documents

) {

    public record CustomerDetails(
            String customerId,
            String fullName,
            String email,
            String mobile,
            String pan,
            LocalDate dob,
            AddressDetails address
    ) {}

    public record AddressDetails(
            String addressType,
            String addressLine1,
            String addressLine2,
            String city,
            String state,
            String postalCode,
            String country
    ) {}

    public record DocumentDetails(
            UUID id,
            String documentReferenceId,
            String documentType,
            String fileName,
            String contentType,
            Long contentSizeBytes,
            String status,
            Instant uploadedAt
    ) {}
}