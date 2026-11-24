package com.fintech.card.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Request payload for underwriting staff to approve a card application")
public class ApproveCardApplicationRequest {

    @Schema(description = "Underwritten and sanctioned credit limit in INR", example = "250000.00")
    private BigDecimal limit;

    @Schema(description = "Sanctioned limit alias for limit", example = "250000.00")
    private BigDecimal approvedLimit;

    public BigDecimal getLimit() { return limit; }
    public void setLimit(BigDecimal limit) { this.limit = limit; }

    public BigDecimal getApprovedLimit() { return approvedLimit; }
    public void setApprovedLimit(BigDecimal approvedLimit) { this.approvedLimit = approvedLimit; }

    public BigDecimal getEffectiveLimit() {
        if (approvedLimit != null) return approvedLimit;
        if (limit != null) return limit;
        return new BigDecimal("250000.00");
    }
}
