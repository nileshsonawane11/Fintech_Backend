package com.fintech.notification.controller;

import com.fintech.notification.dto.response.NotificationListResponse;
import com.fintech.notification.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<NotificationListResponse> listNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "20") int limit) {

        String customerId = jwt.getSubject();
        NotificationListResponse response = notificationService.listNotifications(customerId, unreadOnly, limit);
        return ResponseEntity.ok(response);
    }
}
