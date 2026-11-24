package com.fintech.card.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Request payload to tokenize a payment card for recurring / merchant tokenization")
public class CreateCardTokenRequest {

    @NotBlank(message = "tokenRequestor is required")
    @Schema(description = "Identity or name of the merchant token requestor", example = "AMAZON_PAY_IN")
    private String tokenRequestor;

    @Schema(description = "Customer tokenization consent reference ID", example = "CST-CONSENT-9912")
    private String consentId;

    public String getTokenRequestor() { return tokenRequestor; }
    public void setTokenRequestor(String tokenRequestor) { this.tokenRequestor = tokenRequestor; }

    public String getConsentId() { return consentId; }
    public void setConsentId(String consentId) { this.consentId = consentId; }
}
