package com.fintech.notification.dto.response;

import java.time.Instant;
import java.util.Map;

public class NotificationDto {

    private String notificationId;
    private String eventId;
    private String eventType;
    private String sourceService;
    private String category;
    private String priority;
    private String aggregateType;
    private String aggregateId;
    private String templateCode;
    private String channel;
    private String title;
    private String body;
    private boolean read;
    private Instant createdAt;
    private Instant readAt;
    private Map<String, Object> metadata;

    public NotificationDto() {
    }

    public NotificationDto(String notificationId, String templateCode, String channel,
                           String title, String body, boolean read, Instant createdAt) {
        this.notificationId = notificationId;
        this.templateCode = templateCode;
        this.channel = channel;
        this.title = title;
        this.body = body;
        this.read = read;
        this.createdAt = createdAt;
    }

    public String getNotificationId() { return notificationId; }
    public void setNotificationId(String notificationId) { this.notificationId = notificationId; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getSourceService() { return sourceService; }
    public void setSourceService(String sourceService) { this.sourceService = sourceService; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getAggregateType() { return aggregateType; }
    public void setAggregateType(String aggregateType) { this.aggregateType = aggregateType; }

    public String getAggregateId() { return aggregateId; }
    public void setAggregateId(String aggregateId) { this.aggregateId = aggregateId; }

    public String getTemplateCode() { return templateCode; }
    public void setTemplateCode(String templateCode) { this.templateCode = templateCode; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant readAt) { this.readAt = readAt; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}
