package com.fintech.card.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "Details of an issued credit or debit card")
public class CardResponse {

    @Schema(description = "Primary card identifier", example = "CARD-3001")
    private String id;

    @Schema(description = "Domain business card identifier", example = "CARD-3001")
    private String cardId;

    @Schema(description = "Identifier of the card owner customer", example = "CUS-100234")
    private String customerId;

    @Schema(description = "Card type (CREDIT, DEBIT, FOREX_TRAVEL)", example = "CREDIT")
    private String cardType;

    @Schema(description = "Kind of card (CREDIT, DEBIT)", example = "CREDIT")
    private String kind;

    @Schema(description = "Card product name", example = "FinEdge Edge Cashback Card")
    private String cardName;

    @Schema(description = "Product display name (alias for cardName)", example = "FinEdge Edge Cashback Card")
    private String productName;

    @Schema(description = "Product catalog slug identifier", example = "edge-cashback-credit")
    private String productSlug;

    @Schema(description = "Payment card network (RuPay, Visa, Mastercard)", example = "RuPay")
    private String network;

    @Schema(description = "Full masked card number", example = "************1234")
    private String cardNumber;

    @Schema(description = "Masked card number for secure display", example = "************1234")
    private String maskedCardNumber;

    @Schema(description = "Card number alias for maskedCardNumber", example = "************1234")
    private String number;

    @Schema(description = "Card operational status (ACTIVE, BLOCKED)", example = "ACTIVE")
    private String status;

    @Schema(description = "Identifier of the linked funding account", example = "ACC-1001")
    private String linkedAccountId;

    @Schema(description = "Expiry month (1-12)", example = "12")
    private Integer expiryMonth;

    @Schema(description = "Expiry year (4-digit)", example = "2030")
    private Integer expiryYear;

    @Schema(description = "Formatted expiration date (MM/YY)", example = "12/30")
    private String expiryDate;

    @Schema(description = "Total credit limit sanctioned", example = "250000.00")
    private BigDecimal creditLimit;

    @Schema(description = "Total credit limit (alias for creditLimit)", example = "250000.00")
    private BigDecimal totalLimit;

    @Schema(description = "Sanctioned limit (alias for totalLimit)", example = "250000.00")
    private BigDecimal limit;

    @Schema(description = "Available credit balance remaining", example = "231550.00")
    private BigDecimal availableLimit;

    @Schema(description = "Current outstanding balance billed on the card", example = "18450.00")
    private BigDecimal outstanding;

    @Schema(description = "Minimum amount due for next billing cycle", example = "1845.00")
    private BigDecimal minDue;

    @Schema(description = "Payment due date (YYYY-MM-DD)", example = "2026-11-20")
    private String dueDate;

    @Schema(description = "Physical dispatch tracking reference", example = "DSP-100234")
    private String dispatchRef;

    @Schema(description = "Card channel authorization controls")
    private CardControlsDto controls;

    @Schema(description = "Daily spending and withdrawal limits")
    private CardLimitsDto limits;

    public String getId() { return id; }
    public void setId(String id) {
        this.id = id;
        if (this.cardId == null) this.cardId = id;
    }

    public String getCardId() { return cardId; }
    public void setCardId(String cardId) {
        this.cardId = cardId;
        if (this.id == null) this.id = cardId;
    }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) {
        this.cardType = cardType;
        if (this.kind == null) this.kind = cardType;
    }

    public String getKind() { return kind; }
    public void setKind(String kind) {
        this.kind = kind;
        if (this.cardType == null) this.cardType = kind;
    }

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

    public String getNetwork() { return network; }
    public void setNetwork(String network) { this.network = network; }

    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) {
        this.cardNumber = cardNumber;
        if (this.maskedCardNumber == null) this.maskedCardNumber = cardNumber;
        if (this.number == null) this.number = cardNumber;
    }

    public String getMaskedCardNumber() { return maskedCardNumber; }
    public void setMaskedCardNumber(String maskedCardNumber) {
        this.maskedCardNumber = maskedCardNumber;
        if (this.cardNumber == null) this.cardNumber = maskedCardNumber;
        if (this.number == null) this.number = maskedCardNumber;
    }

    public String getNumber() { return number; }
    public void setNumber(String number) {
        this.number = number;
        if (this.maskedCardNumber == null) this.maskedCardNumber = number;
        if (this.cardNumber == null) this.cardNumber = number;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLinkedAccountId() { return linkedAccountId; }
    public void setLinkedAccountId(String linkedAccountId) { this.linkedAccountId = linkedAccountId; }

    public Integer getExpiryMonth() { return expiryMonth; }
    public void setExpiryMonth(Integer expiryMonth) { this.expiryMonth = expiryMonth; }

    public Integer getExpiryYear() { return expiryYear; }
    public void setExpiryYear(Integer expiryYear) { this.expiryYear = expiryYear; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) {
        this.creditLimit = creditLimit;
        if (this.totalLimit == null) this.totalLimit = creditLimit;
        if (this.limit == null) this.limit = creditLimit;
    }

    public BigDecimal getTotalLimit() { return totalLimit; }
    public void setTotalLimit(BigDecimal totalLimit) {
        this.totalLimit = totalLimit;
        if (this.creditLimit == null) this.creditLimit = totalLimit;
        if (this.limit == null) this.limit = totalLimit;
    }

    public BigDecimal getLimit() { return limit; }
    public void setLimit(BigDecimal limit) {
        this.limit = limit;
        if (this.totalLimit == null) this.totalLimit = limit;
        if (this.creditLimit == null) this.creditLimit = limit;
    }

    public BigDecimal getAvailableLimit() { return availableLimit; }
    public void setAvailableLimit(BigDecimal availableLimit) { this.availableLimit = availableLimit; }

    public BigDecimal getOutstanding() { return outstanding; }
    public void setOutstanding(BigDecimal outstanding) { this.outstanding = outstanding; }

    public BigDecimal getMinDue() { return minDue; }
    public void setMinDue(BigDecimal minDue) { this.minDue = minDue; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public String getDispatchRef() { return dispatchRef; }
    public void setDispatchRef(String dispatchRef) { this.dispatchRef = dispatchRef; }

    public CardControlsDto getControls() { return controls; }
    public void setControls(CardControlsDto controls) { this.controls = controls; }

    public CardLimitsDto getLimits() { return limits; }
    public void setLimits(CardLimitsDto limits) { this.limits = limits; }
}
