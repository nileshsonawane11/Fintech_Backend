package com.fintech.card.domain;

import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.exception.CardApplicationValidationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.regex.Pattern;

@Component
public class CardApplicationNormalizer {

    private static final Pattern PAN_PATTERN = Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]$");
    private final CardProductCatalog productCatalog;

    public CardApplicationNormalizer(CardProductCatalog productCatalog) {
        this.productCatalog = productCatalog;
    }

    public CanonicalCardApplication normalize(CardApplicationRequest request) {
        if (request == null) {
            throw new CardApplicationValidationException("Card application payload must not be null.");
        }

        // 1. Resolve and validate linked account ID
        String linkedAccountId = resolveLinkedAccountId(request.getLinkedAccountId(), request.getAccountId());

        // 2. Resolve and validate card type
        String cardType = resolveCardType(request.getCardType(), request.getKind());

        // 3. Resolve and validate card product
        CardProduct product = productCatalog.resolveProduct(
                request.getProductSlug(),
                request.getCardSlug(),
                request.getCardName(),
                request.getProductName(),
                cardType
        );

        // 4. Resolve delivery address ID
        String deliveryAddressId = request.getDeliveryAddressId();
        if (deliveryAddressId == null || deliveryAddressId.isBlank()) {
            throw new CardApplicationValidationException("Delivery address identifier is required.");
        }
        deliveryAddressId = deliveryAddressId.trim();

        // 5. Resolve requested credit limit
        BigDecimal requestedLimit = resolveRequestedLimit(request.getRequestedLimit(), request.getLimit(), cardType, product);

        // 6. Resolve applicant name
        String applicantName = resolveApplicantName(request.getApplicantName(), request.getFullName(), request.getCustomerName());

        // 7. Validate PAN if provided
        String pan = null;
        if (request.getPan() != null && !request.getPan().isBlank()) {
            String candidatePan = request.getPan().trim().toUpperCase();
            if (!PAN_PATTERN.matcher(candidatePan).matches()) {
                throw new CardApplicationValidationException("Invalid PAN format provided.");
            }
            pan = candidatePan;
        }

        return new CanonicalCardApplication(
                product.cardType(),
                product.cardName(),
                product.productSlug(),
                linkedAccountId,
                deliveryAddressId,
                requestedLimit,
                applicantName,
                pan,
                request.getAnnualIncome(),
                request.getMonthlyIncome(),
                request.getReason()
        );
    }

    private String resolveLinkedAccountId(String linkedAccountId, String accountId) {
        String primary = (linkedAccountId != null && !linkedAccountId.isBlank()) ? linkedAccountId.trim() : null;
        String alias = (accountId != null && !accountId.isBlank()) ? accountId.trim() : null;

        if (primary != null && alias != null) {
            if (!primary.equalsIgnoreCase(alias)) {
                throw new CardApplicationValidationException(
                        "Conflicting linked account identifiers provided: linkedAccountId (" + primary +
                                ") and accountId (" + alias + ") must match.");
            }
            return primary;
        }

        if (primary != null) return primary;
        if (alias != null) return alias;

        throw new CardApplicationValidationException("A linked account identifier is required for card application.");
    }

    private String resolveCardType(String cardType, String kind) {
        String type = (cardType != null && !cardType.isBlank()) ? cardType.trim().toUpperCase() : null;
        String k = (kind != null && !kind.isBlank()) ? kind.trim().toUpperCase() : null;

        if (type != null && k != null && !"REPLACEMENT".equalsIgnoreCase(k)) {
            if (!type.equals(k)) {
                throw new CardApplicationValidationException(
                        "Conflicting card types provided: cardType (" + type + ") and kind (" + k + ") must not conflict.");
            }
            return type;
        }

        if (type != null) {
            return type;
        }

        if (k != null && !"REPLACEMENT".equalsIgnoreCase(k)) {
            return k;
        }

        // Default to CREDIT if not explicitly specified
        return "CREDIT";
    }

    private BigDecimal resolveRequestedLimit(BigDecimal requestedLimit, BigDecimal limit, String cardType, CardProduct product) {
        if (requestedLimit != null && limit != null) {
            if (requestedLimit.compareTo(limit) != 0) {
                throw new CardApplicationValidationException(
                        "Conflicting credit limits provided: requestedLimit (" + requestedLimit +
                                ") and limit (" + limit + ") must match.");
            }
        }

        BigDecimal chosen = (requestedLimit != null) ? requestedLimit : limit;

        if ("CREDIT".equalsIgnoreCase(cardType)) {
            if (chosen == null || chosen.compareTo(BigDecimal.ZERO) <= 0) {
                chosen = (product.defaultLimit() != null && product.defaultLimit().compareTo(BigDecimal.ZERO) > 0)
                        ? product.defaultLimit()
                        : new BigDecimal("50000.00");
            }
            if (product.minLimit() != null && chosen.compareTo(product.minLimit()) < 0) {
                throw new CardApplicationValidationException(
                        "Requested credit limit " + chosen + " is below the minimum allowed limit of " + product.minLimit());
            }
            if (product.maxLimit() != null && chosen.compareTo(product.maxLimit()) > 0) {
                throw new CardApplicationValidationException(
                        "Requested credit limit " + chosen + " exceeds the maximum allowed limit of " + product.maxLimit());
            }
            return chosen;
        }

        // For non-credit cards (DEBIT, FOREX)
        return BigDecimal.ZERO;
    }

    private String resolveApplicantName(String applicantName, String fullName, String customerName) {
        if (applicantName != null && !applicantName.isBlank()) return applicantName.trim();
        if (fullName != null && !fullName.isBlank()) return fullName.trim();
        if (customerName != null && !customerName.isBlank()) return customerName.trim();
        return null;
    }
}
