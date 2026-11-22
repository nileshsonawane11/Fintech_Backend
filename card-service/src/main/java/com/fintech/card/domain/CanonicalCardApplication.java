package com.fintech.card.domain;

import java.math.BigDecimal;

public record CanonicalCardApplication(
        String cardType,
        String cardName,
        String productSlug,
        String linkedAccountId,
        String deliveryAddressId,
        BigDecimal requestedLimit,
        String applicantName,
        String pan,
        BigDecimal annualIncome,
        BigDecimal monthlyIncome,
        String reason
) {}
