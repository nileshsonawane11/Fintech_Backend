package com.fintech.card.client.dto;

import java.time.Instant;
import java.util.UUID;

public record AddressVerificationDto(
        UUID id,
        String customerId,
        String identitySubject,
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
) {}
