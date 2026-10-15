package com.fintech.identity.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ConsentResponse(
        UUID consentId,
        String purpose,
        String status,
        Instant grantedAt
) {
}