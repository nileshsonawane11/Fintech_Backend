package com.fintech.notification.dto.response;

import java.time.Instant;

public class NotificationDto {

    private String notificationId;
    private String templateCode;
    private String channel;
    private String title;
    private String body;
    private boolean read;
    private Instant createdAt;

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

    public String getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(String notificationId) {
        this.notificationId = notificationId;
    }

    public String getTemplateCode() {
        return templateCode;
    }

    public void setTemplateCode(String templateCode) {
        this.templateCode = templateCode;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
