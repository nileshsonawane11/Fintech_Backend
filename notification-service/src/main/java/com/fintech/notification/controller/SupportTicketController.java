package com.fintech.notification.controller;

import com.fintech.notification.dto.request.CreateSupportTicketRequest;
import com.fintech.notification.dto.response.SupportTicketResponse;
import com.fintech.notification.service.SupportTicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/support")
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    public SupportTicketController(SupportTicketService supportTicketService) {
        this.supportTicketService = supportTicketService;
    }

    @PostMapping("/tickets")
    public ResponseEntity<SupportTicketResponse> createTicket(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateSupportTicketRequest request) {

        String customerId = jwt.getSubject();
        SupportTicketResponse response = supportTicketService.createTicket(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
