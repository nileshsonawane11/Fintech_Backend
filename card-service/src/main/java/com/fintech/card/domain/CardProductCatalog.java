package com.fintech.card.domain;

import com.fintech.card.exception.CardProductNotFoundException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;

@Component
public class CardProductCatalog {

    private final Map<String, CardProduct> productsBySlug = new HashMap<>();

    public CardProductCatalog() {
        registerProduct(new CardProduct(
                "edge-cashback-credit",
                "FinEdge Edge Cashback Card",
                "CREDIT",
                Set.of("SAVINGS", "CURRENT", "SALARY"),
                new BigDecimal("10000.00"),
                new BigDecimal("1000000.00"),
                new BigDecimal("50000.00")
        ));

        registerProduct(new CardProduct(
                "edge_cashback_card",
                "FinEdge Edge Cashback Credit Card",
                "CREDIT",
                Set.of("SAVINGS", "CURRENT", "SALARY"),
                new BigDecimal("10000.00"),
                new BigDecimal("1000000.00"),
                new BigDecimal("50000.00")
        ));

        registerProduct(new CardProduct(
                "edge-cashback-card",
                "FinEdge Edge Cashback Credit Card",
                "CREDIT",
                Set.of("SAVINGS", "CURRENT", "SALARY"),
                new BigDecimal("10000.00"),
                new BigDecimal("1000000.00"),
                new BigDecimal("50000.00")
        ));

        registerProduct(new CardProduct(
                "platinum-rewards-credit",
                "FinEdge Platinum Rewards Card",
                "CREDIT",
                Set.of("SAVINGS", "CURRENT", "SALARY"),
                new BigDecimal("50000.00"),
                new BigDecimal("2000000.00"),
                new BigDecimal("150000.00")
        ));

        registerProduct(new CardProduct(
                "classic-debit",
                "FinEdge Classic Debit Card",
                "DEBIT",
                Set.of("SAVINGS", "CURRENT", "SALARY"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
        ));

        registerProduct(new CardProduct(
                "classic_debit_card",
                "FinEdge Classic Debit Card",
                "DEBIT",
                Set.of("SAVINGS", "CURRENT", "SALARY"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
        ));

        registerProduct(new CardProduct(
                "classic-debit-card",
                "FinEdge Classic Debit Card",
                "DEBIT",
                Set.of("SAVINGS", "CURRENT", "SALARY"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
        ));

        registerProduct(new CardProduct(
                "forex-travel",
                "FinEdge Global Forex Travel Card",
                "FOREX_TRAVEL",
                Set.of("SAVINGS", "CURRENT", "SALARY"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
        ));
    }

    private void registerProduct(CardProduct product) {
        productsBySlug.put(product.productSlug().toLowerCase(), product);
    }

    public CardProduct resolveProduct(String productSlug, String cardSlug, String cardName, String productName, String cardType) {
        // 1. Try by productSlug / cardSlug
        if (productSlug != null && !productSlug.isBlank()) {
            CardProduct p = productsBySlug.get(productSlug.toLowerCase());
            if (p != null) return p;
        }
        if (cardSlug != null && !cardSlug.isBlank()) {
            CardProduct p = productsBySlug.get(cardSlug.toLowerCase());
            if (p != null) return p;
        }

        // 2. Try matching by card name / product name
        String name = (cardName != null && !cardName.isBlank()) ? cardName : productName;
        if (name != null) {
            String lowerName = name.toLowerCase();
            for (CardProduct p : productsBySlug.values()) {
                if (p.cardName().equalsIgnoreCase(name) || lowerName.contains(p.productSlug().replace("-", " "))) {
                    return p;
                }
            }
            if (lowerName.contains("debit")) {
                return productsBySlug.get("classic-debit");
            }
            if (lowerName.contains("forex") || lowerName.contains("travel")) {
                return productsBySlug.get("forex-travel");
            }
            if (lowerName.contains("cashback")) {
                return productsBySlug.get("edge-cashback-credit");
            }
            if (lowerName.contains("platinum")) {
                return productsBySlug.get("platinum-rewards-credit");
            }
        }

        // 3. Fallback to default by cardType
        if (cardType != null) {
            String type = cardType.toUpperCase();
            if ("DEBIT".equals(type)) {
                return productsBySlug.get("classic-debit");
            }
            if ("FOREX_TRAVEL".equals(type) || "FOREX".equals(type) || "TRAVEL".equals(type)) {
                return productsBySlug.get("forex-travel");
            }
            if ("CREDIT".equals(type)) {
                return productsBySlug.get("edge-cashback-credit");
            }
        }

        // Default credit card
        CardProduct defaultProduct = productsBySlug.get("edge-cashback-credit");
        if (defaultProduct != null) {
            return defaultProduct;
        }

        throw new CardProductNotFoundException("No eligible card product found for the provided parameters.");
    }
}
