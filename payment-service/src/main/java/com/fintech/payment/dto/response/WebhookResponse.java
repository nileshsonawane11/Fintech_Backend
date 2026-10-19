package com.fintech.payment.dto.response;

public class WebhookResponse {
    private boolean received;

    public WebhookResponse() { }

    public WebhookResponse(boolean received) {
        this.received = received;
    }

    public boolean isReceived() { return received; }
    public void setReceived(boolean received) { this.received = received; }
}
