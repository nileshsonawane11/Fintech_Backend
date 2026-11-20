package com.fintech.card.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Request body payload for applying for a new payment or credit card")
public class CardApplicationRequest {

    @Schema(description = "Type or category of card (e.g. CREDIT, DEBIT, FOREX_TRAVEL)", example = "CREDIT")
    private String cardType;

    @Schema(description = "Name of the card product", example = "FinEdge Edge Cashback Card")
    private String cardName;

    @Schema(description = "Product display name (alias for cardName)", example = "FinEdge Edge Cashback Card")
    private String productName;

    @Schema(description = "Product identifier slug", example = "edge-cashback-credit")
    private String productSlug;

    @Schema(description = "Product identifier slug (alias for productSlug)", example = "edge-cashback")
    private String cardSlug;

    @Schema(description = "Identifier of the customer's linked FinEdge funding account", example = "ACC-1001")
    private String linkedAccountId;

    @Schema(description = "Funding account identifier (alias for linkedAccountId)", example = "ACC-1001")
    private String accountId;

    @Schema(description = "Delivery address identifier for physical card dispatch", example = "ADDR-1001")
    private String deliveryAddressId;

    @Schema(description = "Requested credit limit in INR", example = "50000.00")
    private BigDecimal requestedLimit;

    @Schema(description = "Requested credit limit (alias for requestedLimit)", example = "50000.00")
    private BigDecimal limit;

    @Schema(description = "Full name of the applicant", example = "Vikramaditya Sharma")
    private String applicantName;

    @Schema(description = "Full name (alias for applicantName)", example = "Vikramaditya Sharma")
    private String fullName;

    @Schema(description = "Customer name (alias for applicantName)", example = "Vikramaditya Sharma")
    private String customerName;

    @Schema(description = "Annual income range or amount in INR", example = "1200000.00")
    private BigDecimal annualIncome;

    @Schema(description = "Monthly income amount in INR", example = "100000.00")
    private BigDecimal monthlyIncome;

    @Schema(description = "Permanent Account Number (PAN)", example = "FNEGS1023K")
    private String pan;

    @Schema(description = "Kind of card issuance (e.g. CREDIT, DEBIT, Replacement)", example = "CREDIT")
    private String kind;

    @Schema(description = "Reason for application (e.g. replacement reason)", example = "Damaged physical card")
    private String reason;

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getCardName() { return cardName; }
    public void setCardName(String cardName) { this.cardName = cardName; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductSlug() { return productSlug; }
    public void setProductSlug(String productSlug) { this.productSlug = productSlug; }

    public String getCardSlug() { return cardSlug; }
    public void setCardSlug(String cardSlug) { this.cardSlug = cardSlug; }

    public String getLinkedAccountId() { return linkedAccountId; }
    public void setLinkedAccountId(String linkedAccountId) { this.linkedAccountId = linkedAccountId; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getDeliveryAddressId() { return deliveryAddressId; }
    public void setDeliveryAddressId(String deliveryAddressId) { this.deliveryAddressId = deliveryAddressId; }

    public BigDecimal getRequestedLimit() { return requestedLimit; }
    public void setRequestedLimit(BigDecimal requestedLimit) { this.requestedLimit = requestedLimit; }

    public BigDecimal getLimit() { return limit; }
    public void setLimit(BigDecimal limit) { this.limit = limit; }

    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String applicantName) { this.applicantName = applicantName; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public BigDecimal getAnnualIncome() { return annualIncome; }
    public void setAnnualIncome(BigDecimal annualIncome) { this.annualIncome = annualIncome; }

    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }

    public String getPan() { return pan; }
    public void setPan(String pan) { this.pan = pan; }

    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    // Convenience resolvers for flexible frontend payloads
    public String getEffectiveCardType() {
        if (cardType != null && !cardType.isBlank()) {
            return cardType.toUpperCase();
        }
        if (kind != null && !kind.isBlank() && !"Replacement".equalsIgnoreCase(kind)) {
            return kind.toUpperCase();
        }
        String name = getEffectiveCardName().toLowerCase();
        if (name.contains("debit")) return "DEBIT";
        if (name.contains("forex") || name.contains("travel")) return "FOREX_TRAVEL";
        return "CREDIT";
    }

    public String getEffectiveCardName() {
        if (cardName != null && !cardName.isBlank()) return cardName;
        if (productName != null && !productName.isBlank()) return productName;
        String slug = getEffectiveProductSlug();
        if (slug.contains("debit")) return "FinEdge Classic Debit Card";
        if (slug.contains("forex")) return "FinEdge Global Forex Travel Card";
        return "FinEdge Edge Cashback Card";
    }

    public String getEffectiveProductSlug() {
        if (productSlug != null && !productSlug.isBlank()) return productSlug;
        if (cardSlug != null && !cardSlug.isBlank()) return cardSlug;
        if (cardName != null && !cardName.isBlank()) {
            return cardName.toLowerCase().replaceAll("[^a-z0-9]+", "-");
        }
        return "edge-cashback-credit";
    }

    public String getEffectiveLinkedAccountId() {
        if (linkedAccountId != null && !linkedAccountId.isBlank()) return linkedAccountId;
        if (accountId != null && !accountId.isBlank()) return accountId;
        return "ACC-1001";
    }

    public String getEffectiveDeliveryAddressId() {
        if (deliveryAddressId != null && !deliveryAddressId.isBlank()) return deliveryAddressId;
        return "ADDR-1001";
    }

    public BigDecimal getEffectiveRequestedLimit() {
        if (requestedLimit != null) return requestedLimit;
        if (limit != null) return limit;
        return new BigDecimal("50000.00");
    }

    public String getEffectiveCustomerName() {
        if (applicantName != null && !applicantName.isBlank()) return applicantName;
        if (fullName != null && !fullName.isBlank()) return fullName;
        if (customerName != null && !customerName.isBlank()) return customerName;
        return "Valued Customer";
    }
}
