package com.fintech.identity.dto.response;

import java.time.Instant;

public record PasswordChangedResponse(
        String message,
        Instant changedAt
) {
}