package com.fintech.card.dto.request;

import jakarta.validation.constraints.NotBlank;

public class CardApplicationRequest {

    @NotBlank(message = "cardType is required")
    private String cardType;

    @NotBlank(message = "linkedAccountId is required")
    private String linkedAccountId;

    @NotBlank(message = "deliveryAddressId is required")
    private String deliveryAddressId;

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getLinkedAccountId() { return linkedAccountId; }
    public void setLinkedAccountId(String linkedAccountId) { this.linkedAccountId = linkedAccountId; }

    public String getDeliveryAddressId() { return deliveryAddressId; }
    public void setDeliveryAddressId(String deliveryAddressId) { this.deliveryAddressId = deliveryAddressId; }
}
