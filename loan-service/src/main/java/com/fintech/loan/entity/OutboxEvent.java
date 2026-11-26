package com.fintech.loan.entity;

import com.fintech.loan.enums.PublishingStatus;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan_outbox_events")
public class OutboxEvent {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false, unique = true, length = 100)
    private String eventId;

    @Column(name = "topic", nullable = false, length = 150)
    private String topic;

    @Column(name = "aggregate_id", nullable = false, length = 100)
    private String aggregateId;

    @Column(name = "aggregate_type", nullable = false, length = 50)
    private String aggregateType;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "publishing_status", nullable = false, length = 20)
    private PublishingStatus publishingStatus = PublishingStatus.PENDING;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public OutboxEvent() {
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (nextAttemptAt == null) {
            nextAttemptAt = now;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getAggregateId() { return aggregateId; }
    public void setAggregateId(String aggregateId) { this.aggregateId = aggregateId; }

    public String getAggregateType() { return aggregateType; }
    public void setAggregateType(String aggregateType) { this.aggregateType = aggregateType; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }

    public PublishingStatus getPublishingStatus() { return publishingStatus; }
    public void setPublishingStatus(PublishingStatus publishingStatus) { this.publishingStatus = publishingStatus; }

    public int getRetryCount() { return retryCount; }
    public void setRetryCount(int retryCount) { this.retryCount = retryCount; }

    public Instant getNextAttemptAt() { return nextAttemptAt; }
    public void setNextAttemptAt(Instant nextAttemptAt) { this.nextAttemptAt = nextAttemptAt; }

    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
