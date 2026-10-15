package com.fintech.identity.dto.response;

public record OtpVerificationResponse(
        boolean verified,
        String referenceId,
        String purpose
) {
}