package com.fintech.card.controller;

import com.fintech.card.dto.request.BlockCardRequest;
import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.dto.request.CreateCardTokenRequest;
import com.fintech.card.dto.response.*;
import com.fintech.card.service.CardApplicationService;
import com.fintech.card.service.CardService;
import com.fintech.card.service.CardTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cards")
@Tag(name = "Customer Cards", description = "Endpoints for bank card applications, card listings, card freeze/blocking, and digital tokenization")
@SecurityRequirement(name = "BearerAuth")
public class CardController {

    private final CardApplicationService cardApplicationService;
    private final CardService cardService;
    private final CardTokenService cardTokenService;

    public CardController(CardApplicationService cardApplicationService,
                          CardService cardService,
                          CardTokenService cardTokenService) {
        this.cardApplicationService = cardApplicationService;
        this.cardService = cardService;
        this.cardTokenService = cardTokenService;
    }

    // 8.1 Apply for Card
    @PostMapping("/applications")
    @Operation(summary = "Apply for New Card", description = "Submit an application for a virtual or physical debit/credit card linked to a bank account")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Card application accepted and queued for processing"),
            @ApiResponse(responseCode = "400", description = "Invalid application payload"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<CardApplicationResponse> applyForCard(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Idempotency key UUID to guarantee deduplication", example = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d") @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CardApplicationRequest request) {
        String customerId = jwt.getSubject();
        CardApplicationResponse response = cardApplicationService.applyForCard(customerId, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    // 8.2 Get Customer Cards
    @GetMapping
    @Operation(summary = "Get Customer Cards", description = "Retrieve all active, blocked, and expired cards issued to the authenticated customer")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Customer cards retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<CardListResponse> getCustomerCards(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        String customerId = jwt.getSubject();
        CardListResponse response = cardService.getCustomerCards(customerId);
        return ResponseEntity.ok(response);
    }

    // 8.3 Block Card
    @PostMapping("/{cardId}/block")
    @Operation(summary = "Block or Freeze Card", description = "Instantly freeze or permanently block a compromised or lost card")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Card blocked successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid blocking reason or state transition"),
            @ApiResponse(responseCode = "404", description = "Card not found")
    })
    public ResponseEntity<BlockCardResponse> blockCard(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Card identifier (e.g. CRD-1002)") @PathVariable String cardId,
            @Valid @RequestBody BlockCardRequest request) {
        String customerId = jwt.getSubject();
        BlockCardResponse response = cardService.blockCard(customerId, cardId, request);
        return ResponseEntity.ok(response);
    }

    // 8.4 Create Card Token
    @PostMapping("/{cardId}/tokens")
    @Operation(summary = "Create Digital Card Token", description = "Provision a secure digital payment token for mobile wallets (Apple Pay, Google Pay)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Card token provisioned successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid wallet request or card not eligible"),
            @ApiResponse(responseCode = "404", description = "Card not found")
    })
    public ResponseEntity<CardTokenResponse> createCardToken(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Card identifier (e.g. CRD-1002)") @PathVariable String cardId,
            @Parameter(description = "Idempotency key UUID", example = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d") @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreateCardTokenRequest request) {
        String customerId = jwt.getSubject();
        CardTokenResponse response = cardTokenService.createToken(customerId, cardId, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
