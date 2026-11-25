package com.fintech.notification.dto.response;

import java.util.List;

public class NotificationListResponse {

    private List<NotificationDto> data;

    public NotificationListResponse() {
    }

    public NotificationListResponse(List<NotificationDto> data) {
        this.data = data;
    }

    public List<NotificationDto> getData() {
        return data;
    }

    public void setData(List<NotificationDto> data) {
        this.data = data;
    }
}
