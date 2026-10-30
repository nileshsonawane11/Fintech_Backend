package com.fintech.card.dto.request;

import jakarta.validation.constraints.NotBlank;

public class CreateCardTokenRequest {

    @NotBlank(message = "tokenRequestor is required")
    private String tokenRequestor;

    private String consentId;

    public String getTokenRequestor() { return tokenRequestor; }
    public void setTokenRequestor(String tokenRequestor) { this.tokenRequestor = tokenRequestor; }

    public String getConsentId() { return consentId; }
    public void setConsentId(String consentId) { this.consentId = consentId; }
}
