package com.fintech.card.domain;

import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.exception.CardApplicationValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class CardApplicationNormalizerTest {

    private CardApplicationNormalizer normalizer;

    @BeforeEach
    void setUp() {
        CardProductCatalog catalog = new CardProductCatalog();
        normalizer = new CardApplicationNormalizer(catalog);
    }

    @Test
    @DisplayName("Normalizes valid request resolving aliases and products")
    void testNormalize_ValidRequest() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setCardType("CREDIT");
        request.setCardName("FinEdge Edge Cashback Card");
        request.setLinkedAccountId("ACC-1001");
        request.setDeliveryAddressId("ADDR-1001");
        request.setRequestedLimit(new BigDecimal("50000.00"));
        request.setApplicantName("Vikramaditya Sharma");

        CanonicalCardApplication canonical = normalizer.normalize(request);

        assertNotNull(canonical);
        assertEquals("CREDIT", canonical.cardType());
        assertEquals("FinEdge Edge Cashback Card", canonical.cardName());
        assertEquals("edge-cashback-credit", canonical.productSlug());
        assertEquals("ACC-1001", canonical.linkedAccountId());
        assertEquals("ADDR-1001", canonical.deliveryAddressId());
        assertEquals(new BigDecimal("50000.00"), canonical.requestedLimit());
        assertEquals("Vikramaditya Sharma", canonical.applicantName());
    }

    @Test
    @DisplayName("Resolves accountId alias when linkedAccountId is missing")
    void testNormalize_ResolvesAccountIdAlias() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setAccountId("ACC-2002");
        request.setDeliveryAddressId("ADDR-1001");

        CanonicalCardApplication canonical = normalizer.normalize(request);

        assertEquals("ACC-2002", canonical.linkedAccountId());
    }

    @Test
    @DisplayName("Rejects conflicting linkedAccountId and accountId")
    void testNormalize_RejectsConflictingAccounts() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setLinkedAccountId("ACC-1001");
        request.setAccountId("ACC-2002");
        request.setDeliveryAddressId("ADDR-1001");

        assertThrows(CardApplicationValidationException.class, () -> normalizer.normalize(request));
    }

    @Test
    @DisplayName("Rejects conflicting cardType and kind")
    void testNormalize_RejectsConflictingCardTypes() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setLinkedAccountId("ACC-1001");
        request.setDeliveryAddressId("ADDR-1001");
        request.setCardType("CREDIT");
        request.setKind("DEBIT");

        assertThrows(CardApplicationValidationException.class, () -> normalizer.normalize(request));
    }

    @Test
    @DisplayName("Rejects conflicting requestedLimit and limit")
    void testNormalize_RejectsConflictingLimits() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setLinkedAccountId("ACC-1001");
        request.setDeliveryAddressId("ADDR-1001");
        request.setCardType("CREDIT");
        request.setRequestedLimit(new BigDecimal("50000.00"));
        request.setLimit(new BigDecimal("60000.00"));

        assertThrows(CardApplicationValidationException.class, () -> normalizer.normalize(request));
    }

    @Test
    @DisplayName("Rejects invalid PAN format")
    void testNormalize_RejectsInvalidPan() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setLinkedAccountId("ACC-1001");
        request.setDeliveryAddressId("ADDR-1001");
        request.setPan("INVALID_PAN");

        assertThrows(CardApplicationValidationException.class, () -> normalizer.normalize(request));
    }
}
