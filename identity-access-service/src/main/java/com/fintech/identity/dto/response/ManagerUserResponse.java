package com.fintech.identity.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ManagerUserResponse(
        UUID id,
        String mobileNumber,
        String email,
        String managerCode,
        String department,
        String status,
        List<String> roles,
        Instant createdAt
) {
}
