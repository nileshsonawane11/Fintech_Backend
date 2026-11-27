package com.fintech.payment.controller;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.CreatePaymentOrderRequest;
import com.fintech.payment.dto.request.RefundPaymentRequest;
import com.fintech.payment.dto.request.VerifyPaymentRequest;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.dto.response.PaymentOrderResponse;
import com.fintech.payment.dto.response.PaymentTransactionResponse;
import com.fintech.payment.dto.response.RefundResponse;
import com.fintech.payment.security.SecurityUtils;
import com.fintech.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payments", description = "Razorpay Orders creation, Checkout payment verification, payment history, and refunds")
@SecurityRequirement(name = "BearerAuth")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/orders")
    @Operation(summary = "Create Razorpay Payment Order",
            description = "Create an internal payment transaction and Razorpay Order for external collection via Razorpay Checkout")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Razorpay order created"),
            @ApiResponse(responseCode = "400", description = "Invalid order request or internal transfer attempted via Razorpay"),
            @ApiResponse(responseCode = "403", description = "Account ownership mismatch"),
            @ApiResponse(responseCode = "409", description = "Duplicate or conflicting idempotency key"),
            @ApiResponse(responseCode = "422", description = "Limit exceeded or account ineligible")
    })
    public ResponseEntity<PaymentOrderResponse> createOrder(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Idempotency key UUID", example = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
            @RequestHeader(PaymentConstants.HEADER_IDEMPOTENCY_KEY) String idempotencyKey,
            @Valid @RequestBody CreatePaymentOrderRequest request) {
        String identitySubject = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.createOrder(identitySubject, idempotencyKey, request));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify Razorpay Checkout Payment",
            description = "Verify Razorpay Checkout signature, validate payment details against Razorpay API, capture if required, and trigger fulfillment")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Payment verified"),
            @ApiResponse(responseCode = "400", description = "Invalid signature or mismatched order"),
            @ApiResponse(responseCode = "403", description = "Order ownership mismatch"),
            @ApiResponse(responseCode = "404", description = "Order not found")
    })
    public ResponseEntity<PaymentTransactionResponse> verifyCheckoutPayment(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody VerifyPaymentRequest request) {
        String identitySubject = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.verifyCheckoutPayment(identitySubject, request));
    }

    @GetMapping
    @Operation(summary = "List Payment History", description = "Fetch paginated external payment transactions for the authenticated customer")
    public ResponseEntity<PagedResponse<PaymentTransactionResponse>> listPayments(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String identitySubject = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.listPayments(identitySubject, page, size));
    }

    @GetMapping("/{paymentId}")
    @Operation(summary = "Get Payment Transaction", description = "Retrieve a single payment transaction owned by the authenticated customer")
    public ResponseEntity<PaymentTransactionResponse> getPayment(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {
        String identitySubject = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.getPayment(identitySubject, paymentId));
    }

    @GetMapping("/{paymentId}/status")
    @Operation(summary = "Sync & Get Payment Status", description = "Synchronize payment status from Razorpay Orders/Payments API if non-terminal")
    public ResponseEntity<PaymentTransactionResponse> syncPaymentStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {
        String identitySubject = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.syncPaymentStatus(identitySubject, paymentId, false));
    }

    @PostMapping("/{paymentId}/refund")
    @Operation(summary = "Initiate Payment Refund", description = "Initiate a full or partial Razorpay refund for a captured/completed payment")
    public ResponseEntity<RefundResponse> initiateRefund(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(PaymentConstants.HEADER_IDEMPOTENCY_KEY) String idempotencyKey,
            @PathVariable String paymentId,
            @Valid @RequestBody RefundPaymentRequest request) {
        String identitySubject = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(paymentService.initiateRefund(identitySubject, idempotencyKey, paymentId, request, false));
    }
}
