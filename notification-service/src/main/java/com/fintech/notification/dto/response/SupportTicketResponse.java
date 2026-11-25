package com.fintech.notification.dto.response;

import java.time.Instant;

public class SupportTicketResponse {

    private String ticketId;
    private String status;
    private String category;
    private Instant createdAt;

    public SupportTicketResponse() {
    }

    public SupportTicketResponse(String ticketId, String status, String category, Instant createdAt) {
        this.ticketId = ticketId;
        this.status = status;
        this.category = category;
        this.createdAt = createdAt;
    }

    public String getTicketId() {
        return ticketId;
    }

    public void setTicketId(String ticketId) {
        this.ticketId = ticketId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
