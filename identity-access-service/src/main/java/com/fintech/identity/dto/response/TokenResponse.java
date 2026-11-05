package com.fintech.identity.dto.response;

import com.fintech.identity.model.Customer;

import java.util.UUID;

public record TokenResponse(
        Customer customer,
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UUID customerId
) {
}