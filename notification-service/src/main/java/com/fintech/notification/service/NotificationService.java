package com.fintech.notification.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.notification.dto.event.NotificationEventPayload;
import com.fintech.notification.dto.request.CreateNotificationRequest;
import com.fintech.notification.dto.response.NotificationDto;
import com.fintech.notification.dto.response.NotificationListResponse;
import com.fintech.notification.entity.Notification;
import com.fintech.notification.exception.ApiException;
import com.fintech.notification.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public NotificationService(NotificationRepository notificationRepository) {
        this(notificationRepository, new ObjectMapper().findAndRegisterModules());
    }

    @Autowired
    public NotificationService(NotificationRepository notificationRepository, ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
    }

    public NotificationListResponse listNotifications(String customerId, boolean unreadOnly, int limit) {
        return listNotifications(customerId, Set.of(), unreadOnly, 0, limit);
    }

    public NotificationListResponse listNotifications(String customerId, Collection<String> roles,
                                                      boolean unreadOnly, int limit) {
        return listNotifications(customerId, roles, unreadOnly, 0, limit);
    }

    public NotificationListResponse listNotifications(String customerId, Collection<String> roles,
                                                      boolean unreadOnly, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Notification> result;
        if (roles != null && !roles.isEmpty()) {
            result = notificationRepository.findForRecipientOrRoles(customerId, roles, unreadOnly, pageable);
        } else if (unreadOnly) {
            result = notificationRepository.findByCustomerIdAndReadFalse(customerId, pageable);
        } else {
            result = notificationRepository.findByCustomerId(customerId, pageable);
        }

        List<NotificationDto> dtos = result.getContent().stream()
                .map(this::toDto)
                .toList();

        return new NotificationListResponse(
                dtos,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    public long getUnreadCount(String customerId, Collection<String> roles) {
        if (roles != null && !roles.isEmpty()) {
            return notificationRepository.countUnreadForRecipientOrRoles(customerId, roles);
        }
        return notificationRepository.countByCustomerIdAndReadFalse(customerId);
    }

    public NotificationDto getNotificationById(String notificationId, String subject, Collection<String> roles) {
        Notification notification = notificationRepository.findByNotificationId(notificationId)
                .filter(n -> isOwnedBy(n, subject, roles))
                .orElseThrow(() -> new ApiException(
                        "NOTIFICATION_NOT_FOUND",
                        "Notification not found",
                        HttpStatus.NOT_FOUND));
        return toDto(notification);
    }

    @Transactional
    public NotificationDto markAsRead(String notificationId, String subject, Collection<String> roles) {
        Notification notification = notificationRepository.findByNotificationId(notificationId)
                .filter(n -> isOwnedBy(n, subject, roles))
                .orElseThrow(() -> new ApiException(
                        "NOTIFICATION_NOT_FOUND",
                        "Notification not found",
                        HttpStatus.NOT_FOUND));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }
        return toDto(notification);
    }

    @Transactional
    public int markAllAsRead(String subject) {
        return notificationRepository.markAllAsReadForCustomer(subject, Instant.now());
    }

    @Transactional
    public void deleteNotification(String notificationId, String subject) {
        Notification notification = notificationRepository.findByNotificationId(notificationId)
                .filter(n -> subject.equals(n.getCustomerId()))
                .orElseThrow(() -> new ApiException(
                        "NOTIFICATION_NOT_FOUND",
                        "Notification not found",
                        HttpStatus.NOT_FOUND));
        notificationRepository.delete(notification);
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
        n.setPriority("NORMAL");
        n.setRead(false);
        n.setCreatedAt(request.createdAt() != null ? request.createdAt() : Instant.now());

        return saveIdempotently(n);
    }

    @Transactional
    public NotificationDto recordCentralizedEvent(NotificationEventPayload event) {
        if (event.eventId() != null && !event.eventId().isBlank()
                && notificationRepository.existsByEventId(event.eventId())) {
            log.debug("Duplicate centralized notification event ignored idempotently: eventId={}", event.eventId());
            return null;
        }

        Notification n = new Notification();
        n.setId(UUID.randomUUID().toString());
        n.setNotificationId("NOT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        n.setCustomerId(event.recipientId());
        n.setTargetRole(event.targetRole() != null && !event.targetRole().isBlank() ? event.targetRole() : "CUSTOMER");
        n.setEventId(event.eventId());
        n.setEventType(event.eventType());
        n.setSourceService(event.sourceService());
        n.setCategory(event.category());
        n.setPriority(normalizePriority(event.priority()));
        n.setAggregateType(event.aggregateType());
        n.setAggregateId(event.aggregateId());
        n.setReferenceId(event.aggregateId());
        n.setTemplateCode(event.eventType());
        n.setChannel(normalizeChannel(event.channel()));
        n.setTitle(event.title());
        n.setBody(event.message());
        n.setMetadata(serializeMetadata(event.metadata()));
        n.setRead(false);
        n.setCreatedAt(event.timestamp() != null ? event.timestamp() : Instant.now());

        return saveIdempotently(n);
    }

    private NotificationDto saveIdempotently(Notification n) {
        try {
            Notification saved = notificationRepository.save(n);
            log.info("Recorded notification: id={}, recipient={}, source={}, eventType={}, ref={}",
                    saved.getNotificationId(), saved.getCustomerId(), saved.getSourceService(),
                    saved.getTemplateCode(), saved.getReferenceId());
            return toDto(saved);
        } catch (DataIntegrityViolationException ex) {
            if (n.getEventId() != null && notificationRepository.existsByEventId(n.getEventId())) {
                log.debug("Concurrent duplicate notification event ignored idempotently: eventId={}", n.getEventId());
                return null;
            }
            throw ex;
        }
    }

    private boolean isOwnedBy(Notification n, String subject, Collection<String> roles) {
        if (subject.equals(n.getCustomerId())) {
            return true;
        }
        return n.getTargetRole() != null
                && roles != null
                && roles.contains(n.getTargetRole())
                && n.getCustomerId() != null
                && n.getCustomerId().startsWith("ROLE:");
    }

    private String normalizeChannel(String channel) {
        if (channel == null || channel.isBlank()) return "IN_APP";
        String upper = channel.trim().toUpperCase();
        if ("IN_APP".equals(upper) || "SMS".equals(upper) || "EMAIL".equals(upper)) {
            return upper;
        }
        return "IN_APP";
    }

    private String normalizePriority(String priority) {
        if (priority == null || priority.isBlank()) return "NORMAL";
        String upper = priority.trim().toUpperCase();
        if ("LOW".equals(upper) || "NORMAL".equals(upper) || "HIGH".equals(upper) || "CRITICAL".equals(upper)) {
            return upper;
        }
        return "NORMAL";
    }

    private String serializeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception ex) {
            log.warn("Failed to serialize notification metadata: {}", ex.getMessage());
            return null;
        }
    }

    private Map<String, Object> deserializeMetadata(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(metadataJson, new TypeReference<>() {});
        } catch (Exception ex) {
            return null;
        }
    }

    private NotificationDto toDto(Notification notification) {
        NotificationDto dto = new NotificationDto(
                notification.getNotificationId(),
                notification.getTemplateCode(),
                notification.getChannel(),
                notification.getTitle(),
                notification.getBody(),
                notification.isRead(),
                notification.getCreatedAt()
        );
        dto.setEventId(notification.getEventId());
        dto.setEventType(notification.getEventType());
        dto.setSourceService(notification.getSourceService());
        dto.setCategory(notification.getCategory());
        dto.setPriority(notification.getPriority());
        dto.setAggregateType(notification.getAggregateType());
        dto.setAggregateId(notification.getAggregateId());
        dto.setReadAt(notification.getReadAt());
        dto.setMetadata(deserializeMetadata(notification.getMetadata()));
        return dto;
    }
}
