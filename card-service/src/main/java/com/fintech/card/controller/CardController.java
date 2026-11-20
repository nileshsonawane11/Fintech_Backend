package com.fintech.card.controller;

import com.fintech.card.dto.request.BlockCardRequest;
import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.dto.request.CreateCardTokenRequest;
import com.fintech.card.dto.request.PayCardRequest;
import com.fintech.card.dto.request.UpdateCardControlsRequest;
import com.fintech.card.dto.response.*;
import com.fintech.card.service.CardApplicationService;
import com.fintech.card.service.CardService;
import com.fintech.card.service.CardTokenService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cards")
@Tag(name = "Card Management", description = "APIs for customer credit & debit card applications, lifecycle, controls, limits, PIN, tokenization, and payments")
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

    @PostMapping("/applications")
    @Operation(summary = "Apply for a new Card",
            description = "Submits an application for a credit, debit, or travel card. Accepts flexible frontend request parameters.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Card application accepted and queued for underwriting",
                    content = @Content(schema = @Schema(implementation = CardApplicationResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request payload"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Valid JWT Bearer token required"),
            @ApiResponse(responseCode = "409", description = "Duplicate application or reused idempotency key")
    })
    public ResponseEntity<CardApplicationResponse> applyForCard(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Unique idempotency key for safe request retries")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CardApplicationRequest request) {
        String customerId = jwt.getSubject();
        CardApplicationResponse response = cardApplicationService.applyForCard(customerId, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping
    @Operation(summary = "Get Customer Cards",
            description = "Retrieves all issued payment and credit cards belonging to the authenticated customer.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Customer cards retrieved successfully",
                    content = @Content(schema = @Schema(implementation = CardListResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Valid JWT Bearer token required")
    })
    public ResponseEntity<CardListResponse> getCustomerCards(
            @AuthenticationPrincipal Jwt jwt) {
        String customerId = jwt.getSubject();
        CardListResponse response = cardService.getCustomerCards(customerId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{cardId}")
    @Operation(summary = "Get Card by ID",
            description = "Retrieves details of a specific card owned by the authenticated customer.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Card details retrieved successfully",
                    content = @Content(schema = @Schema(implementation = CardResponse.class))),
            @ApiResponse(responseCode = "404", description = "Card not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<CardResponse> getCardById(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Business or UUID card identifier", example = "CARD-3001")
            @PathVariable String cardId) {
        String customerId = jwt.getSubject();
        CardResponse response = cardService.getCardById(customerId, cardId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/applications")
    @Operation(summary = "List My Card Applications",
            description = "Retrieves all card applications submitted by the authenticated customer.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of card applications",
                    content = @Content(schema = @Schema(implementation = CardApplicationResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<List<CardApplicationResponse>> getCustomerApplications(
            @AuthenticationPrincipal Jwt jwt) {
        String customerId = jwt.getSubject();
        List<CardApplicationResponse> response = cardApplicationService.getCustomerApplications(customerId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{cardId}/block")
    @Operation(summary = "Permanently Block Card",
            description = "Permanently locks the card against any future authorization attempts due to theft, loss, or fraud.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Card blocked successfully",
                    content = @Content(schema = @Schema(implementation = BlockCardResponse.class))),
            @ApiResponse(responseCode = "404", description = "Card not found"),
            @ApiResponse(responseCode = "409", description = "Card is already blocked"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<BlockCardResponse> blockCard(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Card identifier", example = "CARD-3001")
            @PathVariable String cardId,
            @RequestBody(required = false) BlockCardRequest request) {
        String customerId = jwt.getSubject();
        if (request == null) {
            request = new BlockCardRequest();
        }
        BlockCardResponse response = cardService.blockCard(customerId, cardId, request);
        return ResponseEntity.ok(response);
    }

    @RequestMapping(value = "/{cardId}/controls", method = {RequestMethod.PUT, RequestMethod.POST})
    @Operation(summary = "Update Card Controls & Spending Limits",
            description = "Configures channel toggles (online, ATM, contactless, international) and daily spend/withdrawal limits.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Controls updated successfully",
                    content = @Content(schema = @Schema(implementation = CardControlResponse.class))),
            @ApiResponse(responseCode = "404", description = "Card not found"),
            @ApiResponse(responseCode = "422", description = "Card is blocked or invalid control values"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<CardControlResponse> updateControls(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Card identifier", example = "CARD-3001")
            @PathVariable String cardId,
            @RequestBody UpdateCardControlsRequest request) {
        String customerId = jwt.getSubject();
        CardControlResponse response = cardService.updateControls(customerId, cardId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{cardId}/pay")
    @Operation(summary = "Pay Credit Card Bill",
            description = "Settles outstanding credit card billing balance from the specified linked account.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Payment processed successfully",
                    content = @Content(schema = @Schema(implementation = PayCardResponse.class))),
            @ApiResponse(responseCode = "404", description = "Card not found"),
            @ApiResponse(responseCode = "422", description = "Invalid payment amount or funding account"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<PayCardResponse> payCard(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Card identifier", example = "CARD-3001")
            @PathVariable String cardId,
            @Valid @RequestBody PayCardRequest request) {
        String customerId = jwt.getSubject();
        PayCardResponse response = cardService.payCard(customerId, cardId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{cardId}/tokens")
    @Operation(summary = "Create Card Token",
            description = "Generates a network surrogate token for secure recurring merchant transactions.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Card token created successfully",
                    content = @Content(schema = @Schema(implementation = CardTokenResponse.class))),
            @ApiResponse(responseCode = "404", description = "Card not found"),
            @ApiResponse(responseCode = "422", description = "Card not eligible for tokenization"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<CardTokenResponse> createCardToken(
            @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Card identifier", example = "CARD-3001")
            @PathVariable String cardId,
            @Parameter(description = "Unique idempotency key for tokenization")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateCardTokenRequest request) {
        String customerId = jwt.getSubject();
        String effectiveIdempotencyKey = (idempotencyKey != null && !idempotencyKey.isBlank())
                ? idempotencyKey
                : java.util.UUID.randomUUID().toString();
        CardTokenResponse response = cardTokenService.createToken(customerId, cardId, effectiveIdempotencyKey, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
