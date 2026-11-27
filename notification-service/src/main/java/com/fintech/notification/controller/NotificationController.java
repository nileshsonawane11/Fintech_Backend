package com.fintech.notification.controller;

import com.fintech.notification.dto.response.NotificationDto;
import com.fintech.notification.dto.response.NotificationListResponse;
import com.fintech.notification.dto.response.UnreadCountResponse;
import com.fintech.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "Authenticated user notification inbox and read-status APIs")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @Operation(summary = "List user notifications", description = "Fetches paginated notifications belonging to the authenticated user.")
    public ResponseEntity<NotificationListResponse> listNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "20") int limit) {

        String customerId = jwt.getSubject();
        Set<String> roles = extractRoles(jwt);
        int effectiveSize = size != null ? size : limit;
        NotificationListResponse response = notificationService.listNotifications(
                customerId, roles, unreadOnly, page, effectiveSize);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread")
    @Operation(summary = "List unread notifications", description = "Fetches paginated unread notifications belonging to the authenticated user.")
    public ResponseEntity<NotificationListResponse> listUnreadNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        String customerId = jwt.getSubject();
        Set<String> roles = extractRoles(jwt);
        return ResponseEntity.ok(notificationService.listNotifications(customerId, roles, true, page, size));
    }

    @GetMapping("/unread/count")
    @Operation(summary = "Get unread notification count", description = "Returns the count of unread notifications for the authenticated user.")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(@AuthenticationPrincipal Jwt jwt) {
        String customerId = jwt.getSubject();
        Set<String> roles = extractRoles(jwt);
        return ResponseEntity.ok(new UnreadCountResponse(notificationService.getUnreadCount(customerId, roles)));
    }

    @GetMapping("/{notificationId}")
    @Operation(summary = "Get notification by ID", description = "Fetches a single notification owned by the authenticated user.")
    public ResponseEntity<NotificationDto> getNotification(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String notificationId) {

        String customerId = jwt.getSubject();
        Set<String> roles = extractRoles(jwt);
        return ResponseEntity.ok(notificationService.getNotificationById(notificationId, customerId, roles));
    }

    @PatchMapping("/{notificationId}/read")
    @Operation(summary = "Mark notification as read", description = "Marks a specific notification owned by the authenticated user as read.")
    public ResponseEntity<NotificationDto> markAsRead(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String notificationId) {

        String customerId = jwt.getSubject();
        Set<String> roles = extractRoles(jwt);
        return ResponseEntity.ok(notificationService.markAsRead(notificationId, customerId, roles));
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Mark all notifications as read", description = "Marks all unread notifications belonging to the authenticated user as read.")
    public ResponseEntity<Map<String, Object>> markAllAsRead(@AuthenticationPrincipal Jwt jwt) {
        String customerId = jwt.getSubject();
        int updated = notificationService.markAllAsRead(customerId);
        return ResponseEntity.ok(Map.of("updatedCount", updated));
    }

    @DeleteMapping("/{notificationId}")
    @Operation(summary = "Delete notification", description = "Deletes a notification owned by the authenticated user.")
    public ResponseEntity<Void> deleteNotification(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String notificationId) {

        String customerId = jwt.getSubject();
        notificationService.deleteNotification(notificationId, customerId);
        return ResponseEntity.noContent().build();
    }

    private Set<String> extractRoles(Jwt jwt) {
        List<String> raw = jwt.getClaimAsStringList("roles");
        if (raw == null || raw.isEmpty()) {
            return Set.of();
        }
        Set<String> roles = new LinkedHashSet<>();
        for (String role : raw) {
            if (role != null && !role.isBlank()) {
                String clean = role.trim().toUpperCase();
                if (clean.startsWith("ROLE_")) {
                    clean = clean.substring(5);
                }
                roles.add(clean);
                if ("OPERATIONS".equals(clean)) roles.add("LOAN_OFFICER");
                if ("MANAGER".equals(clean)) roles.add("LOAN_MANAGER");
            }
        }
        return roles;
    }
}
