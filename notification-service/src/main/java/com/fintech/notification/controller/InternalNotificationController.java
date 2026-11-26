package com.fintech.notification.controller;

import com.fintech.notification.dto.request.CreateNotificationRequest;
import com.fintech.notification.dto.response.NotificationDto;
import com.fintech.notification.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/api/v1/notifications")
public class InternalNotificationController {

    private final NotificationService notificationService;

    public InternalNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
    public ResponseEntity<NotificationDto> createInternalNotification(
            @Valid @RequestBody CreateNotificationRequest request) {
        NotificationDto dto = notificationService.recordNotification(request);
        if (dto == null) {
            return ResponseEntity.status(HttpStatus.OK).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }
}
