package com.fintech.account.client;

import java.time.LocalDate;

public record CustomerProfileDto(
        String customerId,
        String fullName,
        LocalDate dateOfBirth,
        String mobileNumber,
        String email,
        String pan,
        String kycStatus,
        String riskCategory
) {}
