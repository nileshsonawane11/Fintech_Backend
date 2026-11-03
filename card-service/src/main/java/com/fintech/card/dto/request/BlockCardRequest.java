package com.fintech.card.dto.request;

import jakarta.validation.constraints.NotBlank;

public class BlockCardRequest {

    @NotBlank(message = "reason is required")
    private String reason;

    private String remarks;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
