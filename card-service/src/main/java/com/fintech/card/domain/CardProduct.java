package com.fintech.card.domain;

import java.math.BigDecimal;
import java.util.Set;

public record CardProduct(
        String productSlug,
        String cardName,
        String cardType,
        Set<String> eligibleAccountTypes,
        BigDecimal minLimit,
        BigDecimal maxLimit,
        BigDecimal defaultLimit
) {
    public boolean isAccountTypeEligible(String accountType) {
        if (accountType == null) return false;
        return eligibleAccountTypes.contains(accountType.toUpperCase());
    }

    public boolean isLimitWithinRange(BigDecimal limit) {
        if (limit == null) return false;
        if (minLimit != null && limit.compareTo(minLimit) < 0) return false;
        if (maxLimit != null && limit.compareTo(maxLimit) > 0) return false;
        return true;
    }
}
