package com.fintech.card.dto.response;

import java.time.OffsetDateTime;

public class CardTokenResponse {
    private String cardTokenId;
    private String cardId;
    private String tokenReference;
    private String status;
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
