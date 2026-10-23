package com.fintech.payment.controller;

import com.fintech.payment.dto.request.InitiateTransferRequest;
import com.fintech.payment.dto.response.PaymentResponse;
import com.fintech.payment.dto.response.PaymentStatusResponse;
import com.fintech.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/transfers")
    public ResponseEntity<PaymentResponse> initiateTransfer(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody InitiateTransferRequest request) {

        String userId = jwt.getSubject();
        PaymentResponse response =
                paymentService.initiateTransfer(userId, idempotencyKey, request);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {

        PaymentStatusResponse response =
                paymentService.getPaymentStatus(jwt.getSubject(), paymentId);

        return ResponseEntity.ok(response);
    }
}