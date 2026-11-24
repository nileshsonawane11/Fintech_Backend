package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.OffsetDateTime;

@Schema(description = "Tokenized payment card credential reference")
public class CardTokenResponse {

    @Schema(description = "Unique card token entity ID", example = "TKN-991204")
    private String cardTokenId;

    @Schema(description = "Domain business card ID associated with this token", example = "CARD-3001")
    private String cardId;

    @Schema(description = "Network token reference surrogate", example = "NTKN-4820199201")
    private String tokenReference;

    @Schema(description = "Token lifecycle status (ACTIVE, SUSPENDED, DELETED)", example = "ACTIVE")
    private String status;

    @Schema(description = "Timestamp when token was minted", example = "2026-11-20T12:00:00Z")
    private OffsetDateTime createdAt;

    public String getCardTokenId() { return cardTokenId; }
    public void setCardTokenId(String cardTokenId) { this.cardTokenId = cardTokenId; }

    public String getCardId() { return cardId; }
    public void setCardId(String cardId) { this.cardId = cardId; }

    public String getTokenReference() { return tokenReference; }
    public void setTokenReference(String tokenReference) { this.tokenReference = tokenReference; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
