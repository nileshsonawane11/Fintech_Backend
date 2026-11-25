package com.fintech.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class CreateSupportTicketRequest {

    @NotNull(message = "Category is required")
    @Pattern(
        regexp = "PAYMENT_ISSUE|ACCOUNT_ISSUE|CARD_ISSUE|LOAN_ISSUE|GENERAL",
        message = "Category must be one of: PAYMENT_ISSUE, ACCOUNT_ISSUE, CARD_ISSUE, LOAN_ISSUE, GENERAL"
    )
    private String category;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Description is required")
    private String description;

    private String relatedPaymentId;

    public CreateSupportTicketRequest() {
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRelatedPaymentId() {
        return relatedPaymentId;
    }

    public void setRelatedPaymentId(String relatedPaymentId) {
        this.relatedPaymentId = relatedPaymentId;
    }
}
