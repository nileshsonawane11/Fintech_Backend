package com.fintech.notification.service;

import com.fintech.notification.dto.response.NotificationDto;
import com.fintech.notification.dto.response.NotificationListResponse;
import com.fintech.notification.entity.Notification;
import com.fintech.notification.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public NotificationListResponse listNotifications(String customerId, boolean unreadOnly, int limit) {
        int safeLimit = Math.min(limit, 100);
        Pageable pageable = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Notification> page;
        if (unreadOnly) {
            page = notificationRepository.findByCustomerIdAndReadFalse(customerId, pageable);
        } else {
            page = notificationRepository.findByCustomerId(customerId, pageable);
        }

        List<NotificationDto> dtos = page.getContent().stream()
                .map(this::toDto)
                .toList();

        return new NotificationListResponse(dtos);
    }

    private NotificationDto toDto(Notification notification) {
        return new NotificationDto(
                notification.getNotificationId(),
                notification.getTemplateCode(),
                notification.getChannel(),
                notification.getTitle(),
                notification.getBody(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
