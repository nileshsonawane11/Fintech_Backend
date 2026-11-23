package com.fintech.card.controller;

import com.fintech.card.dto.response.PublicCardProductResponse;
import com.fintech.card.service.CardProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/public/api/v1/card-products"})
@Tag(name = "Public - Card Catalog", description = "Publicly accessible endpoints for discovering available active credit and debit card products")
public class CardProductPublicController {

    private final CardProductService cardProductService;

    public CardProductPublicController(CardProductService cardProductService) {
        this.cardProductService = cardProductService;
    }

    @GetMapping
    @Operation(summary = "List Active Card Products",
            description = "Public catalog endpoint to browse all currently available credit and debit card products. Excludes inactive or archived products.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active card products retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PublicCardProductResponse.class)))
    })
    public ResponseEntity<List<PublicCardProductResponse>> listPublicProducts(
            @Parameter(description = "Optional filter by card type: CREDIT or DEBIT")
            @RequestParam(required = false) String cardType) {

        List<PublicCardProductResponse> list = cardProductService.listPublicActiveProducts(cardType);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{productCode}")
    @Operation(summary = "Get Public Card Product Details",
            description = "Retrieve detailed information, eligibility requirements, limits, and fee schedule for a specific active card product by its product code.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Card product details retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PublicCardProductResponse.class))),
            @ApiResponse(responseCode = "404", description = "Card product not found or is currently inactive")
    })
    public ResponseEntity<PublicCardProductResponse> getPublicProduct(
            @Parameter(description = "Unique product code identifier", example = "EDGE_CASHBACK_CARD")
            @PathVariable String productCode) {

        PublicCardProductResponse response = cardProductService.getPublicProductByCode(productCode);
        return ResponseEntity.ok(response);
    }
}
