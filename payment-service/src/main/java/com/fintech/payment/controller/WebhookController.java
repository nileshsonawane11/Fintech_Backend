package com.fintech.payment.controller;

import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.service.WebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments/webhooks")
public class WebhookController {

    private final WebhookService webhookService;

    public WebhookController(WebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping("/payment-rail")
    public ResponseEntity<WebhookResponse> handlePaymentRailWebhook(
            @RequestHeader(value = "X-Signature", required = false)
            String signature,
            @RequestHeader(value = "X-Timestamp", required = false)
            String timestamp,
            @RequestBody byte[] payload) {

        WebhookResponse response =
                webhookService.processWebhook(signature, timestamp, payload);

        return ResponseEntity.ok(response);
    }
}