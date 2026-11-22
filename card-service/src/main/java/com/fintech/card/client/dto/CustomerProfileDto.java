package com.fintech.card.client.dto;

import java.time.LocalDate;

public record CustomerProfileDto(
        String customerId,
        String fullName,
        LocalDate dateOfBirth,
        String mobileMasked,
        String emailMasked,
        String panMasked,
        String kycStatus,
        String riskCategory,
        String gender
) {}
