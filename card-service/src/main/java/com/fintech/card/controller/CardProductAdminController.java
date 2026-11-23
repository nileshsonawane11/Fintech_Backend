package com.fintech.card.controller;

import com.fintech.card.dto.request.CardProductStatusRequest;
import com.fintech.card.dto.request.CreateCardProductRequest;
import com.fintech.card.dto.request.UpdateCardProductRequest;
import com.fintech.card.dto.response.AdminCardProductResponse;
import com.fintech.card.dto.response.PagedCardProductResponse;
import com.fintech.card.service.CardProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping({"/ops/api/v1/card-products"})
@Tag(name = "Card Product Administration", description = "Secured administrative endpoints for managing credit and debit card products")
@SecurityRequirement(name = "BearerAuth")
@PreAuthorize("hasAuthority('CARD_PRODUCT_ADMIN') or hasRole('ADMIN') or hasRole('OPERATIONS') or hasRole('MANAGER')")
public class CardProductAdminController {

    private final CardProductService cardProductService;

    public CardProductAdminController(CardProductService cardProductService) {
        this.cardProductService = cardProductService;
    }

    @PostMapping
    @Operation(summary = "Create Card Product", description = "Create a new credit or debit card product catalog entry.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Card product created successfully",
                    content = @Content(schema = @Schema(implementation = AdminCardProductResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or configuration"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires ADMIN or OPERATIONS privileges"),
            @ApiResponse(responseCode = "409", description = "Product code already exists")
    })
    public ResponseEntity<AdminCardProductResponse> createProduct(
            @Valid @RequestBody CreateCardProductRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String createdBy = (jwt != null && jwt.getSubject() != null) ? jwt.getSubject() : "ADMIN";
        AdminCardProductResponse response = cardProductService.createProduct(request, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update Card Product", description = "Update configuration, fees, limits, or metadata of an existing card product by ID or product code.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Card product updated successfully",
                    content = @Content(schema = @Schema(implementation = AdminCardProductResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid update payload"),
            @ApiResponse(responseCode = "404", description = "Card product not found"),
            @ApiResponse(responseCode = "409", description = "Product code conflict")
    })
    public ResponseEntity<AdminCardProductResponse> updateProduct(
            @Parameter(description = "Product UUID or product code identifier", example = "c0000000-0000-0000-0000-000000000001")
            @PathVariable String id,
            @Valid @RequestBody UpdateCardProductRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String updatedBy = (jwt != null && jwt.getSubject() != null) ? jwt.getSubject() : "ADMIN";
        UUID productUuid = resolveUuid(id);
        AdminCardProductResponse response = cardProductService.updateProduct(productUuid, request, updatedBy);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "List Card Products (Admin)", description = "Retrieve paginated list of all card products with filtering by type, status, and search keywords.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Card products retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PagedCardProductResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<PagedCardProductResponse<AdminCardProductResponse>> listProducts(
            @Parameter(description = "Filter by card type (CREDIT or DEBIT)")
            @RequestParam(required = false) String cardType,
            @Parameter(description = "Filter by active status (true or false)")
            @RequestParam(required = false) Boolean active,
            @Parameter(description = "Include soft-deleted products (default false)")
            @RequestParam(defaultValue = "false") Boolean includeDeleted,
            @Parameter(description = "Search by product code or name")
            @RequestParam(required = false) String search,
            @Parameter(description = "Page number (0-based, default 0)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size (default 20, max 100)")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field (e.g. productName, productCode, createdAt)")
            @RequestParam(defaultValue = "productName") String sortBy,
            @Parameter(description = "Sort direction (ASC or DESC)")
            @RequestParam(defaultValue = "ASC") String sortDirection) {

        PagedCardProductResponse<AdminCardProductResponse> response =
                cardProductService.listAdminProducts(cardType, active, includeDeleted, search, page, size, sortBy, sortDirection);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get Card Product Details (Admin)", description = "Retrieve full card product details by UUID or product code.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Product details retrieved",
                    content = @Content(schema = @Schema(implementation = AdminCardProductResponse.class))),
            @ApiResponse(responseCode = "404", description = "Card product not found")
    })
    public ResponseEntity<AdminCardProductResponse> getProduct(
            @Parameter(description = "Product UUID or product code identifier", example = "EDGE_CASHBACK_CARD")
            @PathVariable String id) {

        AdminCardProductResponse response;
        try {
            UUID uuid = UUID.fromString(id);
            response = cardProductService.getAdminProductById(uuid);
        } catch (IllegalArgumentException e) {
            response = cardProductService.getAdminProductByCode(id);
        }
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Activate / Deactivate Card Product", description = "Change product active status without altering configuration.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status updated successfully",
                    content = @Content(schema = @Schema(implementation = AdminCardProductResponse.class))),
            @ApiResponse(responseCode = "404", description = "Card product not found")
    })
    public ResponseEntity<AdminCardProductResponse> updateProductStatus(
            @Parameter(description = "Product UUID or product code identifier", example = "EDGE_CASHBACK_CARD")
            @PathVariable String id,
            @Valid @RequestBody CardProductStatusRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String updatedBy = (jwt != null && jwt.getSubject() != null) ? jwt.getSubject() : "ADMIN";
        UUID productUuid = resolveUuid(id);
        AdminCardProductResponse response = cardProductService.updateProductStatus(productUuid, request.active(), updatedBy);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete Card Product", description = "Perform safe soft-delete on a card product.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Card product deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Card product not found")
    })
    public ResponseEntity<Void> deleteProduct(
            @Parameter(description = "Product UUID or product code identifier", example = "EDGE_CASHBACK_CARD")
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {

        String deletedBy = (jwt != null && jwt.getSubject() != null) ? jwt.getSubject() : "ADMIN";
        UUID productUuid = resolveUuid(id);
        cardProductService.deleteProduct(productUuid, deletedBy);
        return ResponseEntity.noContent().build();
    }

    private UUID resolveUuid(String identifier) {
        try {
            return UUID.fromString(identifier);
        } catch (IllegalArgumentException e) {
            // Resolve UUID by code
            AdminCardProductResponse p = cardProductService.getAdminProductByCode(identifier);
            return p.id();
        }
    }
}
