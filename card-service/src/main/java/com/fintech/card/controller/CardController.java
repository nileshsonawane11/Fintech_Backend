package com.fintech.card.controller;

import com.fintech.card.dto.request.BlockCardRequest;
import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.dto.request.CreateCardTokenRequest;
import com.fintech.card.dto.response.*;
import com.fintech.card.service.CardApplicationService;
import com.fintech.card.service.CardService;
import com.fintech.card.service.CardTokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cards")
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
    public ResponseEntity<CardApplicationResponse> applyForCard(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CardApplicationRequest request) {
        String customerId = jwt.getSubject();
        CardApplicationResponse response = cardApplicationService.applyForCard(customerId, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    // 8.2 Get Customer Cards
    @GetMapping
    public ResponseEntity<CardListResponse> getCustomerCards(
            @AuthenticationPrincipal Jwt jwt) {
        String customerId = jwt.getSubject();
        CardListResponse response = cardService.getCustomerCards(customerId);
        return ResponseEntity.ok(response);
    }

    // 8.3 Block Card
    @PostMapping("/{cardId}/block")
    public ResponseEntity<BlockCardResponse> blockCard(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String cardId,
            @Valid @RequestBody BlockCardRequest request) {
        String customerId = jwt.getSubject();
        BlockCardResponse response = cardService.blockCard(customerId, cardId, request);
        return ResponseEntity.ok(response);
    }

    // 8.4 Create Card Token
    @PostMapping("/{cardId}/tokens")
    public ResponseEntity<CardTokenResponse> createCardToken(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String cardId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreateCardTokenRequest request) {
        String customerId = jwt.getSubject();
        CardTokenResponse response = cardTokenService.createToken(customerId, cardId, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
