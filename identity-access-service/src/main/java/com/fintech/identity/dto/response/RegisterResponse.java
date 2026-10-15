package com.fintech.identity.dto.response;

import java.util.UUID;

public record RegisterResponse(
        UUID userId,
        String mobileNumber,
        String email,
        String status,
        String nextStep,
        String referenceId
) {
}