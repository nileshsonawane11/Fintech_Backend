package com.fintech.identity.dto.response;

public record LoginResponse(
        String tokenType,
        long expiresIn,
        boolean mfaRequired,
        String mfaReferenceId,
        String temporaryToken
) {
}