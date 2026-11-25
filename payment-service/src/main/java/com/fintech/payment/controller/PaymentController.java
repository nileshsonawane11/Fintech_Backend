package com.fintech.payment.controller;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.InitiateTransferRequest;
import com.fintech.payment.dto.request.InitiateUpiTransferRequest;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.dto.response.PaymentResponse;
import com.fintech.payment.dto.response.PaymentStatusResponse;
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
@Tag(name = "Payments", description = "Endpoints for initiating outgoing bank/UPI payouts and tracking transfer status")
@SecurityRequirement(name = "BearerAuth")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/transfers")
    @Operation(summary = "Initiate Bank Transfer", description = "Initiate NEFT/IMPS/RTGS transfer from a FinBank account to a verified beneficiary")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Payment transfer accepted and submitted"),
            @ApiResponse(responseCode = "400", description = "Invalid transfer request"),
            @ApiResponse(responseCode = "403", description = "KYC not approved, account ownership mismatch, or unverified beneficiary"),
            @ApiResponse(responseCode = "409", description = "Duplicate or conflicting idempotency key"),
            @ApiResponse(responseCode = "422", description = "Insufficient balance or limit exceeded")
    })
    public ResponseEntity<PaymentResponse> initiateTransfer(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Idempotency key UUID", example = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
            @RequestHeader(PaymentConstants.HEADER_IDEMPOTENCY_KEY) String idempotencyKey,
            @Valid @RequestBody InitiateTransferRequest request) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(paymentService.initiateTransfer(userId, idempotencyKey, request));
    }

    @PostMapping("/transfers/upi")
    @Operation(summary = "Initiate UPI Payout", description = "Initiate a UPI transfer from a FinBank account to a verified UPI beneficiary")
    public ResponseEntity<PaymentResponse> initiateUpiTransfer(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(PaymentConstants.HEADER_IDEMPOTENCY_KEY) String idempotencyKey,
            @Valid @RequestBody InitiateUpiTransferRequest request) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(paymentService.initiateUpiTransfer(userId, idempotencyKey, request));
    }

    @GetMapping("/transfers")
    @Operation(summary = "List Transfer History", description = "Fetch paginated outgoing transfer history for the authenticated customer")
    public ResponseEntity<PagedResponse<PaymentStatusResponse>> listTransfers(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.listTransfers(userId, page, size));
    }

    @GetMapping("/{paymentId}")
    @Operation(summary = "Get Transfer Details", description = "Query status, UTR, fees, and ledger linkage for a transfer")
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.getPaymentStatus(userId, paymentId));
    }

    @GetMapping("/{paymentId}/status")
    @Operation(summary = "Sync & Get Live Transfer Status", description = "Refresh status from RazorpayX if non-terminal and return current transfer status")
    public ResponseEntity<PaymentStatusResponse> syncAndGetStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.syncTransferStatus(userId, paymentId, false));
    }

    @PostMapping("/{paymentId}/cancel")
    @Operation(summary = "Cancel Queued Transfer", description = "Cancel a queued RazorpayX payout and reverse reserved ledger funds")
    public ResponseEntity<PaymentStatusResponse> cancelQueuedTransfer(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.cancelQueuedTransfer(userId, paymentId));
    }
}
