package com.fintech.card.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload for underwriting staff to reject a card application")
public class RejectCardApplicationRequest {

    @Schema(description = "Operational remarks or reason code for declining application", example = "Credit assessment criteria not satisfied")
    private String remarks;

    public String getRemarks() {
        return (remarks == null || remarks.isBlank()) ? "Credit assessment criteria not satisfied" : remarks;
    }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
