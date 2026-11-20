package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Response returned after updating card channel controls and limits")
public class CardControlResponse {

    @Schema(description = "Card identifier", example = "CARD-3001")
    private String cardId;

    @Schema(description = "Updated card authorization controls")
    private CardControlsDto controls;

    @Schema(description = "Updated card spending limits")
    private CardLimitsDto limits;

    public CardControlResponse() {}

    public CardControlResponse(String cardId, CardControlsDto controls, CardLimitsDto limits) {
        this.cardId = cardId;
        this.controls = controls;
        this.limits = limits;
    }

    public String getCardId() { return cardId; }
    public void setCardId(String cardId) { this.cardId = cardId; }

    public CardControlsDto getControls() { return controls; }
    public void setControls(CardControlsDto controls) { this.controls = controls; }

    public CardLimitsDto getLimits() { return limits; }
    public void setLimits(CardLimitsDto limits) { this.limits = limits; }
}
