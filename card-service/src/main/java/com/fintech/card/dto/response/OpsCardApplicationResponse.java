package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Schema(description = "Detailed card application record for branch operations and underwriting review")
public class OpsCardApplicationResponse {

    @Schema(description = "Primary unique identifier", example = "CARD-APP-400123")
    private String id;

    @Schema(description = "Domain application identifier", example = "CARD-APP-400123")
    private String cardApplicationId;

    @Schema(description = "Customer CIF identifier", example = "CUS-100234")
    private String customerId;

    @Schema(description = "Applicant full name", example = "Vikramaditya Sharma")
    private String customerName;

    @Schema(description = "Card type applied for", example = "CREDIT")
    private String cardType;

    @Schema(description = "Product name", example = "FinEdge Edge Cashback Card")
    private String cardName;

    @Schema(description = "Product display name", example = "FinEdge Edge Cashback Card")
    private String productName;

    @Schema(description = "Product catalog slug", example = "edge-cashback-credit")
    private String productSlug;

    @Schema(description = "Linked funding account identifier", example = "ACC-1001")
    private String linkedAccountId;

    @Schema(description = "Delivery address identifier", example = "ADDR-1001")
    private String deliveryAddressId;

    @Schema(description = "Requested limit in INR", example = "50000.00")
    private BigDecimal requestedLimit;

    @Schema(description = "Approved credit limit in INR", example = "250000.00")
    private BigDecimal approvedLimit;

    @Schema(description = "Underwriting status", example = "PENDING_APPROVAL")
    private String status;

    @Schema(description = "Declination remarks if rejected", example = "Credit criteria not met")
    private String rejectionReason;

    @Schema(description = "Submission timestamp", example = "2026-11-20T10:00:00Z")
    private OffsetDateTime submittedAt;

    public String getId() { return id; }
    public void setId(String id) {
        this.id = id;
        if (this.cardApplicationId == null) this.cardApplicationId = id;
    }

    public String getCardApplicationId() { return cardApplicationId; }
    public void setCardApplicationId(String cardApplicationId) {
        this.cardApplicationId = cardApplicationId;
        if (this.id == null) this.id = cardApplicationId;
    }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getCardName() { return cardName; }
    public void setCardName(String cardName) {
        this.cardName = cardName;
        if (this.productName == null) this.productName = cardName;
    }

    public String getProductName() { return productName; }
    public void setProductName(String productName) {
        this.productName = productName;
        if (this.cardName == null) this.cardName = productName;
    }

    public String getProductSlug() { return productSlug; }
    public void setProductSlug(String productSlug) { this.productSlug = productSlug; }

    public String getLinkedAccountId() { return linkedAccountId; }
    public void setLinkedAccountId(String linkedAccountId) { this.linkedAccountId = linkedAccountId; }

    public String getDeliveryAddressId() { return deliveryAddressId; }
    public void setDeliveryAddressId(String deliveryAddressId) { this.deliveryAddressId = deliveryAddressId; }

    public BigDecimal getRequestedLimit() { return requestedLimit; }
    public void setRequestedLimit(BigDecimal requestedLimit) { this.requestedLimit = requestedLimit; }

    public BigDecimal getApprovedLimit() { return approvedLimit; }
    public void setApprovedLimit(BigDecimal approvedLimit) { this.approvedLimit = approvedLimit; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(OffsetDateTime submittedAt) { this.submittedAt = submittedAt; }
}
