
package com.fintech.account.dto.response;

import com.fintech.account.enums.AccountType;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record AccountProductResponse(

        // Existing product information
        String productCode,
        String productName,
        String description,
        AccountType accountType,
        String currency,

        // Banking configuration
        BigDecimal minimumBalance,
        BigDecimal minimumInitialFunding,
        BigDecimal interestRate,
        BigDecimal dailyTransferLimit,
        BigDecimal monthlyTransferLimit,
        Integer minimumAge,
        Integer maximumAge,
        boolean requiresKyc,
        boolean active,

        // Product identification
        String slug,
        String category,
        String tagline,
        String status,
        String interestNote,

        // Product configuration
        Map<String, Object> amb,
        Map<String, Object> fees,
        List<Map<String, Object>> charges,

        // Product information lists
        List<String> documents,
        List<String> eligibility,
        List<Map<String, Object>> faqs,
        List<String> features,
        List<String> howToApply,

        // Interest rate configuration
        List<Map<String, Object>> rateSlabs

) {}