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

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

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
        Set<String> roles = extractRoles(jwt);
        NotificationListResponse response = notificationService.listNotifications(customerId, roles, unreadOnly, limit);
        return ResponseEntity.ok(response);
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
