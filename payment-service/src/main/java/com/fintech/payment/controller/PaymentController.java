package com.fintech.payment.controller;

import com.fintech.payment.dto.request.InitiateTransferRequest;
import com.fintech.payment.dto.response.PaymentResponse;
import com.fintech.payment.dto.response.PaymentStatusResponse;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payments", description = "Endpoints for initiating financial payments, fund transfers, and payment lifecycle tracking")
@SecurityRequirement(name = "BearerAuth")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/transfers")
    @Operation(summary = "Initiate Payment Transfer", description = "Initiate fund transfer from source bank account to destination beneficiary with idempotency protection")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Payment transfer accepted and submitted for settlement"),
            @ApiResponse(responseCode = "400", description = "Invalid transfer request or validation error"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<PaymentResponse> initiateTransfer(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Idempotency key UUID", example = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d") @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody InitiateTransferRequest request) {

        String userId = jwt.getSubject();
        PaymentResponse response =
                paymentService.initiateTransfer(userId, idempotencyKey, request);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{paymentId}")
    @Operation(summary = "Get Payment Status", description = "Query real-time status, clearing confirmation, and receipt for a specific payment")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Payment status retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Payment not found")
    })
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Payment identifier (e.g. PAY-1002)") @PathVariable String paymentId) {

        PaymentStatusResponse response =
                paymentService.getPaymentStatus(jwt.getSubject(), paymentId);

        return ResponseEntity.ok(response);
    }
}
