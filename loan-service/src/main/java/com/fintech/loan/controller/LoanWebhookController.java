package com.fintech.loan.controller;

import com.fintech.loan.service.LoanWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/loans/webhooks")
@Tag(name = "Webhooks - Payments & Mandates", description = "Signed provider webhook endpoints for payment and mandate settlement")
public class LoanWebhookController {

    private final LoanWebhookService webhookService;

    public LoanWebhookController(LoanWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping("/payments/{provider}")
    @Operation(summary = "Handle External Payment Webhook")
    public ResponseEntity<Map<String, Object>> handlePaymentWebhook(
            @PathVariable String provider,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String razorpaySig,
            @RequestHeader(value = "X-Signature", required = false) String genericSig,
            @RequestHeader(value = "X-Webhook-Event-Id", required = false) String eventId,
            @RequestBody byte[] payload) {
        String signature = razorpaySig != null ? razorpaySig : genericSig;
        return ResponseEntity.ok(webhookService.processPaymentWebhook(provider, signature, eventId, payload));
    }

    @PostMapping("/mandates/{provider}")
    @Operation(summary = "Handle External Mandate Webhook")
    public ResponseEntity<Map<String, Object>> handleMandateWebhook(
            @PathVariable String provider,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String razorpaySig,
            @RequestHeader(value = "X-Signature", required = false) String genericSig,
            @RequestHeader(value = "X-Webhook-Event-Id", required = false) String eventId,
            @RequestBody byte[] payload) {
        String signature = razorpaySig != null ? razorpaySig : genericSig;
        return ResponseEntity.ok(webhookService.processMandateWebhook(provider, signature, eventId, payload));
    }
}
