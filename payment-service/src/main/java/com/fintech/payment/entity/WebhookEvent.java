package com.fintech.payment.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "webhook_events")
public class WebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "rail_reference", nullable = false, unique = true, length = 50)
    private String railReference;

    @Column(name = "payment_reference", length = 50)
    private String paymentReference;

    @Column(name = "status", length = 30)
    private String status;

    @Column(name = "status_reason", length = 100)
    private String statusReason;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @PrePersist
    public void prePersist() {
        receivedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRailReference() { return railReference; }
    public void setRailReference(String railReference) { this.railReference = railReference; }

    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }
}
