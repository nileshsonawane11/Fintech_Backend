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
@Tag(name = "Payment Webhooks", description = "Signed webhook endpoints for Razorpay Smart Collect 2.0, RazorpayX Payouts, and payment rails")
public class WebhookController {

    private final WebhookService webhookService;

    public WebhookController(WebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping("/razorpay/smart-collect")
    @Operation(summary = "Handle Razorpay Smart Collect Webhook",
            description = "Verify X-Razorpay-Signature on raw body and process virtual_account.credited, payment.captured, payment.failed, virtual_account.closed, and refund events")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Webhook verified and processed"),
            @ApiResponse(responseCode = "400", description = "Invalid signature or malformed payload")
    })
    public ResponseEntity<WebhookResponse> handleSmartCollectWebhook(
            @Parameter(description = "Razorpay HMAC-SHA256 signature")
            @RequestHeader(value = PaymentConstants.HEADER_RAZORPAY_SIGNATURE, required = false) String signature,
            @Parameter(description = "Razorpay webhook delivery event ID")
            @RequestHeader(value = PaymentConstants.HEADER_RAZORPAY_EVENT_ID, required = false) String eventId,
            @RequestBody byte[] payload) {
        return ResponseEntity.ok(webhookService.processRazorpaySmartCollectWebhook(signature, eventId, payload));
    }

    @PostMapping("/razorpayx")
    @Operation(summary = "Handle RazorpayX Webhook",
            description = "Verify X-Razorpay-Signature on raw body and process payout.* and fund_account.validation.* events")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Webhook verified and processed"),
            @ApiResponse(responseCode = "400", description = "Invalid signature or malformed payload")
    })
    public ResponseEntity<WebhookResponse> handleRazorpayXWebhook(
            @RequestHeader(value = PaymentConstants.HEADER_RAZORPAY_SIGNATURE, required = false) String signature,
            @RequestHeader(value = PaymentConstants.HEADER_RAZORPAY_EVENT_ID, required = false) String eventId,
            @RequestBody byte[] payload) {
        return ResponseEntity.ok(webhookService.processRazorpayXWebhook(signature, eventId, payload));
    }

    @PostMapping("/payment-rail")
    @Operation(summary = "Handle Legacy Payment Rail Webhook", description = "Legacy signed payment rail status webhook")
    public ResponseEntity<WebhookResponse> handlePaymentRailWebhook(
            @RequestHeader(value = PaymentConstants.HEADER_LEGACY_SIGNATURE, required = false) String signature,
            @RequestHeader(value = PaymentConstants.HEADER_LEGACY_TIMESTAMP, required = false) String timestamp,
            @RequestBody byte[] payload) {
        return ResponseEntity.ok(webhookService.processWebhook(signature, timestamp, payload));
    }
}