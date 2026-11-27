package com.fintech.notification.dto.response;

import java.util.List;

public class NotificationListResponse {

    private List<NotificationDto> data;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    public NotificationListResponse() {
    }

    public NotificationListResponse(List<NotificationDto> data) {
        this.data = data;
        this.page = 0;
        this.size = data != null ? data.size() : 0;
        this.totalElements = this.size;
        this.totalPages = this.size > 0 ? 1 : 0;
    }

    public NotificationListResponse(List<NotificationDto> data, int page, int size, long totalElements, int totalPages) {
        this.data = data;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
    }

    public List<NotificationDto> getData() { return data; }
    public void setData(List<NotificationDto> data) { this.data = data; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
}
