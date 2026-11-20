package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.OffsetDateTime;

@Schema(description = "Confirmation response when a card is permanently blocked")
public class BlockCardResponse {

    @Schema(description = "Primary card identifier", example = "CARD-3001")
    private String id;

    @Schema(description = "Domain business card identifier", example = "CARD-3001")
    private String cardId;

    @Schema(description = "New card status (BLOCKED)", example = "BLOCKED")
    private String status;

    @Schema(description = "Timestamp when blocking was finalized", example = "2026-11-20T12:00:00Z")
    private OffsetDateTime blockedAt;

    @Schema(description = "Recorded blocking reason", example = "LOST")
    private String reason;

    public String getId() { return id; }
    public void setId(String id) {
        this.id = id;
        if (this.cardId == null) this.cardId = id;
    }

    public String getCardId() { return cardId; }
    public void setCardId(String cardId) {
        this.cardId = cardId;
        if (this.id == null) this.id = cardId;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getBlockedAt() { return blockedAt; }
    public void setBlockedAt(OffsetDateTime blockedAt) { this.blockedAt = blockedAt; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
