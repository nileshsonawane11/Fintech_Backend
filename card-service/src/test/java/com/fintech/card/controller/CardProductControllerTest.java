package com.fintech.card.controller;

import com.fintech.card.dto.request.CardProductStatusRequest;
import com.fintech.card.dto.request.CreateCardProductRequest;
import com.fintech.card.dto.request.UpdateCardProductRequest;
import com.fintech.card.dto.response.AdminCardProductResponse;
import com.fintech.card.dto.response.PagedCardProductResponse;
import com.fintech.card.dto.response.PublicCardProductResponse;
import com.fintech.card.entity.config.CreditCardConfig;
import com.fintech.card.entity.config.DebitCardConfig;
import com.fintech.card.enums.CardType;
import com.fintech.card.service.CardProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardProductControllerTest {

    @Mock
    private CardProductService cardProductService;

    private CardProductAdminController adminController;
    private CardProductPublicController publicController;
    private Jwt adminJwt;

    private UUID sampleId;
    private AdminCardProductResponse adminResponse;
    private PublicCardProductResponse publicResponse;

    @BeforeEach
    void setUp() {
        adminController = new CardProductAdminController(cardProductService);
        publicController = new CardProductPublicController(cardProductService);

        adminJwt = Jwt.withTokenValue("mock.admin.jwt")
                .header("alg", "RS256")
                .claim("sub", "ADMIN-001")
                .claim("roles", List.of("ADMIN"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        sampleId = UUID.randomUUID();

        adminResponse = new AdminCardProductResponse(
                sampleId,
                "EDGE_CASHBACK_CARD",
                "FinEdge Edge Cashback Credit Card",
                CardType.CREDIT,
                "RUPAY",
                "5% cashback card",
                "Full description",
                new BigDecimal("499.00"),
                new BigDecimal("499.00"),
                new BigDecimal("3.50"),
                21,
                65,
                new BigDecimal("25000.00"),
                720,
                List.of("SALARIED"),
                6,
                true,
                false,
                new CreditCardConfig(),
                null,
                null,
                null,
                null,
                null,
                Instant.now(),
                Instant.now(),
                "ADMIN",
                "ADMIN",
                0L
        );

        publicResponse = new PublicCardProductResponse(
                sampleId,
                "EDGE_CASHBACK_CARD",
                "FinEdge Edge Cashback Credit Card",
                CardType.CREDIT,
                "RUPAY",
                "5% cashback card",
                "Full description",
                new BigDecimal("499.00"),
                new BigDecimal("499.00"),
                new BigDecimal("3.50"),
                21,
                65,
                new BigDecimal("25000.00"),
                720,
                List.of("SALARIED"),
                6,
                new CreditCardConfig(),
                null,
                null,
                null,
                null,
                null
        );
    }

    // =========================================================================
    // Admin Controller Tests
    // =========================================================================

    @Test
    @DisplayName("Admin: POST createProduct returns 201 Created")
    void testAdminCreateProduct() {
        CreateCardProductRequest request = new CreateCardProductRequest(
                "EDGE_CASHBACK_CARD",
                "FinEdge Edge Cashback Credit Card",
                CardType.CREDIT,
                "RUPAY",
                "5% cashback",
                "Description",
                new BigDecimal("499.00"),
                new BigDecimal("499.00"),
                new BigDecimal("3.50"),
                21, 65,
                new BigDecimal("25000.00"), 720,
                List.of("SALARIED"), 6, true,
                new CreditCardConfig(), null, null, null, null, null
        );

        when(cardProductService.createProduct(eq(request), eq("ADMIN-001"))).thenReturn(adminResponse);

        ResponseEntity<AdminCardProductResponse> response = adminController.createProduct(request, adminJwt);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("EDGE_CASHBACK_CARD", response.getBody().productCode());
    }

    @Test
    @DisplayName("Admin: PUT updateProduct returns 200 OK")
    void testAdminUpdateProduct() {
        UpdateCardProductRequest updateReq = new UpdateCardProductRequest(
                null, "Updated Name", null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        when(cardProductService.updateProduct(eq(sampleId), eq(updateReq), eq("ADMIN-001"))).thenReturn(adminResponse);

        ResponseEntity<AdminCardProductResponse> response =
                adminController.updateProduct(sampleId.toString(), updateReq, adminJwt);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("Admin: GET listProducts returns paged response")
    void testAdminListProducts() {
        PagedCardProductResponse<AdminCardProductResponse> paged = new PagedCardProductResponse<>(
                List.of(adminResponse), 0, 20, 1L, 1, true, true
        );

        when(cardProductService.listAdminProducts(isNull(), isNull(), eq(false), isNull(), eq(0), eq(20), eq("productName"), eq("ASC")))
                .thenReturn(paged);

        ResponseEntity<PagedCardProductResponse<AdminCardProductResponse>> response =
                adminController.listProducts(null, null, false, null, 0, 20, "productName", "ASC");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().content().size());
    }

    @Test
    @DisplayName("Admin: GET getProduct by UUID returns 200 OK")
    void testAdminGetProductByUuid() {
        when(cardProductService.getAdminProductById(sampleId)).thenReturn(adminResponse);

        ResponseEntity<AdminCardProductResponse> response = adminController.getProduct(sampleId.toString());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("EDGE_CASHBACK_CARD", response.getBody().productCode());
    }

    @Test
    @DisplayName("Admin: GET getProduct by productCode returns 200 OK")
    void testAdminGetProductByCode() {
        when(cardProductService.getAdminProductByCode("EDGE_CASHBACK_CARD")).thenReturn(adminResponse);

        ResponseEntity<AdminCardProductResponse> response = adminController.getProduct("EDGE_CASHBACK_CARD");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("EDGE_CASHBACK_CARD", response.getBody().productCode());
    }

    @Test
    @DisplayName("Admin: PATCH updateProductStatus returns 200 OK")
    void testAdminUpdateStatus() {
        CardProductStatusRequest statusReq = new CardProductStatusRequest(false);
        when(cardProductService.updateProductStatus(eq(sampleId), eq(false), eq("ADMIN-001"))).thenReturn(adminResponse);

        ResponseEntity<AdminCardProductResponse> response =
                adminController.updateProductStatus(sampleId.toString(), statusReq, adminJwt);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("Admin: DELETE deleteProduct returns 204 No Content")
    void testAdminDeleteProduct() {
        doNothing().when(cardProductService).deleteProduct(eq(sampleId), eq("ADMIN-001"));

        ResponseEntity<Void> response = adminController.deleteProduct(sampleId.toString(), adminJwt);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(cardProductService).deleteProduct(sampleId, "ADMIN-001");
    }

    // =========================================================================
    // Public Controller Tests
    // =========================================================================

    @Test
    @DisplayName("Public: GET listPublicProducts returns active products")
    void testPublicListProducts() {
        when(cardProductService.listPublicActiveProducts("CREDIT")).thenReturn(List.of(publicResponse));

        ResponseEntity<List<PublicCardProductResponse>> response = publicController.listPublicProducts("CREDIT");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
        assertEquals("EDGE_CASHBACK_CARD", response.getBody().get(0).productCode());
    }

    @Test
    @DisplayName("Public: GET getPublicProduct returns product details by code")
    void testPublicGetProductByCode() {
        when(cardProductService.getPublicProductByCode("EDGE_CASHBACK_CARD")).thenReturn(publicResponse);

        ResponseEntity<PublicCardProductResponse> response = publicController.getPublicProduct("EDGE_CASHBACK_CARD");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("EDGE_CASHBACK_CARD", response.getBody().productCode());
    }
}
