package com.fintech.payment.client.dto;

import java.time.Instant;
import java.time.LocalDate;

public record CustomerProfileDto(
        String customerId,
        String fullName,
        LocalDate dateOfBirth,
        String mobileNumber,
        String email,
        String pan,
        String kycStatus,
        String riskCategory,
        Instant createdAt,
        String gender
) {}
