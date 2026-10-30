package com.fintech.card.dto.response;

import java.time.LocalDate;

public class CardApplicationResponse {
    private String cardApplicationId;
    private String cardType;
    private String status;
    private LocalDate estimatedDeliveryTime;

    public String getCardApplicationId() { return cardApplicationId; }
    public void setCardApplicationId(String cardApplicationId) { this.cardApplicationId = cardApplicationId; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getEstimatedDeliveryTime() { return estimatedDeliveryTime; }
    public void setEstimatedDeliveryTime(LocalDate estimatedDeliveryTime) { this.estimatedDeliveryTime = estimatedDeliveryTime; }
}
