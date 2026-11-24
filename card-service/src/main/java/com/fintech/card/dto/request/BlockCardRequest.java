package com.fintech.card.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload to block a payment card permanently")
public class BlockCardRequest {

    @Schema(description = "Reason code for blocking the card (e.g. LOST, STOLEN, DAMAGED, CUSTOMER_REQUEST)", example = "CUSTOMER_REQUEST")
    private String reason;

    @Schema(description = "Optional additional remarks or operator audit note", example = "Card blocked by customer request via web portal")
    private String remarks;

    public String getReason() {
        return (reason == null || reason.isBlank()) ? "CUSTOMER_REQUEST" : reason;
    }
    public void setReason(String reason) { this.reason = reason; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
