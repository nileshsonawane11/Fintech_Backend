package com.fintech.loan.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "loan_inbox_events")
public class LoanInboxEvent {

    @Id
    @Column(name = "event_id", nullable = false, length = 100)
    private String eventId;

    @Column(name = "topic", nullable = false, length = 150)
    private String topic;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "consumer_group", nullable = false, length = 100)
    private String consumerGroup;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PROCESSING";

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    public LoanInboxEvent() {
    }

    @PrePersist
    public void prePersist() {
        if (receivedAt == null) {
            receivedAt = Instant.now();
        }
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getConsumerGroup() { return consumerGroup; }
    public void setConsumerGroup(String consumerGroup) { this.consumerGroup = consumerGroup; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }

    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
}
