package com.fintech.identity.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OperationsUserResponse(
        UUID id,
        String mobileNumber,
        String email,
        String employeeCode,
        String department,
        String designation,
        UUID managerId,
        String status,
        List<String> roles,
        Instant createdAt
) {
}
