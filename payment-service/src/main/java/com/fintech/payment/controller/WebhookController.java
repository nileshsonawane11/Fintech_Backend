package com.fintech.payment.controller;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.response.WebhookResponse;
import com.fintech.payment.service.WebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments/webhooks")
@Tag(name = "Payment Webhooks", description = "Signed webhook endpoint for Razorpay Orders & Payments events")
public class WebhookController {

    private final WebhookService webhookService;

    public WebhookController(WebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping("/razorpay")
    @Operation(summary = "Handle Razorpay Webhook",
            description = "Verify X-Razorpay-Signature on raw body and process payment.authorized, payment.captured, payment.failed, order.paid, and refund.* events")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Webhook verified and processed"),
            @ApiResponse(responseCode = "400", description = "Invalid signature or malformed payload")
    })
    public ResponseEntity<WebhookResponse> handleRazorpayWebhook(
            @Parameter(description = "Razorpay HMAC-SHA256 signature")
            @RequestHeader(value = PaymentConstants.HEADER_RAZORPAY_SIGNATURE, required = false) String signature,
            @Parameter(description = "Razorpay webhook delivery event ID")
            @RequestHeader(value = PaymentConstants.HEADER_RAZORPAY_EVENT_ID, required = false) String eventId,
            @RequestBody byte[] payload) {
        return ResponseEntity.ok(webhookService.processRazorpayWebhook(signature, eventId, payload));
    }
}
