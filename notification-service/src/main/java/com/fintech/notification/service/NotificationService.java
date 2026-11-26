package com.fintech.notification.service;

import com.fintech.notification.dto.request.CreateNotificationRequest;
import com.fintech.notification.dto.response.NotificationDto;
import com.fintech.notification.dto.response.NotificationListResponse;
import com.fintech.notification.entity.Notification;
import com.fintech.notification.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public NotificationListResponse listNotifications(String customerId, boolean unreadOnly, int limit) {
        return listNotifications(customerId, Set.of(), unreadOnly, limit);
    }

    public NotificationListResponse listNotifications(String customerId, Collection<String> roles,
                                                      boolean unreadOnly, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        Pageable pageable = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Notification> page;
        if (roles != null && !roles.isEmpty()) {
            page = notificationRepository.findForRecipientOrRoles(customerId, roles, unreadOnly, pageable);
        } else if (unreadOnly) {
            page = notificationRepository.findByCustomerIdAndReadFalse(customerId, pageable);
        } else {
            page = notificationRepository.findByCustomerId(customerId, pageable);
        }

        List<NotificationDto> dtos = page.getContent().stream()
                .map(this::toDto)
                .toList();

        return new NotificationListResponse(dtos);
    }

    @Transactional
    public NotificationDto recordNotification(CreateNotificationRequest request) {
        if (request.eventId() != null && !request.eventId().isBlank()
                && notificationRepository.existsByEventId(request.eventId())) {
            log.debug("Duplicate notification event ignored idempotently: eventId={}", request.eventId());
            return null;
        }

        Notification n = new Notification();
        n.setId(UUID.randomUUID().toString());
        n.setNotificationId("NOT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        n.setCustomerId(request.recipientId());
        n.setTargetRole(request.targetRole());
        n.setEventId(request.eventId());
        n.setReferenceId(request.referenceId());
        n.setTemplateCode(request.templateCode());
        n.setChannel(normalizeChannel(request.channel()));
        n.setTitle(request.title());
        n.setBody(request.body());
        n.setRead(false);
        n.setCreatedAt(request.createdAt() != null ? request.createdAt() : Instant.now());

        Notification saved = notificationRepository.save(n);
        log.info("Recorded notification: id={}, recipient={}, role={}, template={}, ref={}",
                saved.getNotificationId(), saved.getCustomerId(), saved.getTargetRole(),
                saved.getTemplateCode(), saved.getReferenceId());
        return toDto(saved);
    }

    private String normalizeChannel(String channel) {
        if (channel == null || channel.isBlank()) return "IN_APP";
        String upper = channel.trim().toUpperCase();
        if ("IN_APP".equals(upper) || "SMS".equals(upper) || "EMAIL".equals(upper)) {
            return upper;
        }
        return "IN_APP";
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
