package com.fintech.investment.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "investment_inbox_events")
public class InvestmentInboxEvent {

    @Id
    @Column(name = "event_id", length = 80)
    private String eventId;

    @Column(name = "topic", nullable = false, length = 120)
    private String topic;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    @PrePersist
    void prePersist() {
        if (processedAt == null) processedAt = Instant.now();
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public Instant getProcessedAt() { return processedAt; }
}
