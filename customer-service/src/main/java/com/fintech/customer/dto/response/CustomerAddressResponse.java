package com.fintech.customer.dto.response;

import java.time.Instant;
import java.util.UUID;

public record CustomerAddressResponse(
        UUID id,
        String addressType,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String country,
        String status,
        boolean deliverable,
        Instant createdAt
) {
}