package com.fintech.card.dto.response;

import java.time.OffsetDateTime;

public class BlockCardResponse {
    private String cardId;
    private String status;
    private OffsetDateTime blockedAt;
    private String reason;

    public String getCardId() { return cardId; }
    public void setCardId(String cardId) { this.cardId = cardId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getBlockedAt() { return blockedAt; }
    public void setBlockedAt(OffsetDateTime blockedAt) { this.blockedAt = blockedAt; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
