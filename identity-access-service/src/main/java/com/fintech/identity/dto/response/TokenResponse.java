package com.fintech.identity.dto.response;

import java.util.UUID;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UUID customerId
) {
}