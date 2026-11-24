package com.fintech.payment.controller;

import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.service.WebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments/webhooks")
@Tag(name = "Payment Webhooks", description = "Asynchronous callback and notification endpoints from payment rails and settlement networks")
public class WebhookController {

    private final WebhookService webhookService;

    public WebhookController(WebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping("/payment-rail")
    @Operation(summary = "Handle Payment Rail Webhook", description = "Receive cryptographically signed payment status updates from external payment clearing networks")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Webhook verified and processed"),
            @ApiResponse(responseCode = "400", description = "Invalid signature or malformed payload")
    })
    public ResponseEntity<WebhookResponse> handlePaymentRailWebhook(
            @Parameter(description = "HMAC-SHA256 signature header") @RequestHeader(value = "X-Signature", required = false)
            String signature,
            @Parameter(description = "ISO-8601 or UNIX epoch timestamp header") @RequestHeader(value = "X-Timestamp", required = false)
            String timestamp,
            @RequestBody byte[] payload) {

        WebhookResponse response =
                webhookService.processWebhook(signature, timestamp, payload);

        return ResponseEntity.ok(response);
    }
}
