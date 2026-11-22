package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Schema(description = "Response returned upon submitting a card application")
public class CardApplicationResponse {

    @Schema(description = "Primary unique identifier of the card application", example = "CARD-APP-400123")
    private String id;

    @Schema(description = "Domain business identifier of the card application", example = "CARD-APP-400123")
    private String cardApplicationId;

    @Schema(description = "Application ID alias", example = "CARD-APP-400123")
    private String applicationId;

    @Schema(description = "Issuance tracking reference number", example = "CARD-APP-400123")
    private String reference;

    @Schema(description = "Customer identifier", example = "CUS-100234")
    private String customerId;

    @Schema(description = "Identity subject from authentication token", example = "CUS-100234")
    private String identitySubject;

    @Schema(description = "Card type applied for (CREDIT, DEBIT, FOREX_TRAVEL)", example = "CREDIT")
    private String cardType;

    @Schema(description = "Kind of card (Credit, Debit, Replacement)", example = "Credit")
    private String kind;

    @Schema(description = "Name of the card product", example = "FinEdge Edge Cashback Card")
    private String cardName;

    @Schema(description = "Display name of the card product", example = "FinEdge Edge Cashback Card")
    private String productName;

    @Schema(description = "Product slug identifier", example = "edge-cashback-credit")
    private String productSlug;

    @Schema(description = "Linked funding account identifier", example = "ACC-1001")
    private String linkedAccountId;

    @Schema(description = "Delivery address identifier", example = "ADDR-1001")
    private String deliveryAddressId;

    @Schema(description = "Requested credit limit", example = "50000.00")
    private BigDecimal requestedLimit;

    @Schema(description = "Approved credit limit", example = "50000.00")
    private BigDecimal approvedLimit;

    @Schema(description = "Status of the application (e.g. PENDING_APPROVAL, UNDER_REVIEW, APPROVED)", example = "PENDING_APPROVAL")
    private String status;

    @Schema(description = "Estimated physical card delivery date", example = "2026-11-27")
    private LocalDate estimatedDeliveryTime;

    @Schema(description = "Estimated delivery date (alias for estimatedDeliveryTime)", example = "2026-11-27")
    private LocalDate estimatedDeliveryDate;

    @Schema(description = "Timestamp when the application was recorded", example = "2026-11-20T11:45:00Z")
    private OffsetDateTime submittedAt;

    public String getId() { return id; }
    public void setId(String id) {
        this.id = id;
        if (this.cardApplicationId == null) this.cardApplicationId = id;
        if (this.applicationId == null) this.applicationId = id;
        if (this.reference == null) this.reference = id;
    }

    public String getCardApplicationId() { return cardApplicationId; }
    public void setCardApplicationId(String cardApplicationId) {
        this.cardApplicationId = cardApplicationId;
        if (this.id == null) this.id = cardApplicationId;
        if (this.applicationId == null) this.applicationId = cardApplicationId;
        if (this.reference == null) this.reference = cardApplicationId;
    }

    public String getApplicationId() { return applicationId; }
    public void setApplicationId(String applicationId) { this.applicationId = applicationId; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getIdentitySubject() { return identitySubject; }
    public void setIdentitySubject(String identitySubject) { this.identitySubject = identitySubject; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }

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

    public LocalDate getEstimatedDeliveryTime() { return estimatedDeliveryTime; }
    public void setEstimatedDeliveryTime(LocalDate estimatedDeliveryTime) {
        this.estimatedDeliveryTime = estimatedDeliveryTime;
        if (this.estimatedDeliveryDate == null) this.estimatedDeliveryDate = estimatedDeliveryTime;
    }

    public LocalDate getEstimatedDeliveryDate() { return estimatedDeliveryDate; }
    public void setEstimatedDeliveryDate(LocalDate estimatedDeliveryDate) {
        this.estimatedDeliveryDate = estimatedDeliveryDate;
        if (this.estimatedDeliveryTime == null) this.estimatedDeliveryTime = estimatedDeliveryDate;
    }

    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(OffsetDateTime submittedAt) { this.submittedAt = submittedAt; }
}
