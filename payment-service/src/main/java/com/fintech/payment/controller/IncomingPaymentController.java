package com.fintech.payment.controller;

import com.fintech.payment.dto.request.CreateIncomingReceiverRequest;
import com.fintech.payment.dto.response.IncomingPaymentResponse;
import com.fintech.payment.dto.response.IncomingReceiverResponse;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.security.SecurityUtils;
import com.fintech.payment.service.IncomingPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments/incoming")
@Tag(name = "Incoming Payments (Smart Collect)", description = "Endpoints for Razorpay Smart Collect 2.0 virtual accounts and incoming payments")
@SecurityRequirement(name = "BearerAuth")
public class IncomingPaymentController {

    private final IncomingPaymentService incomingPaymentService;

    public IncomingPaymentController(IncomingPaymentService incomingPaymentService) {
        this.incomingPaymentService = incomingPaymentService;
    }

    @PostMapping("/receivers")
    @Operation(summary = "Create or Retrieve Receiving Details", description = "Provision or retrieve a customer-specific Smart Collect 2.0 virtual bank account & UPI receiver")
    public ResponseEntity<IncomingReceiverResponse> createOrRetrieveReceiver(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateIncomingReceiverRequest request) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(incomingPaymentService.createOrRetrieveReceiver(userId, request));
    }

    @GetMapping("/receivers")
    @Operation(summary = "List Receiving Details", description = "List virtual collection receivers owned by the authenticated customer")
    public ResponseEntity<PagedResponse<IncomingReceiverResponse>> listReceivers(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(incomingPaymentService.listReceivers(userId, page, size));
    }

    @GetMapping("/receivers/{receiverId}")
    @Operation(summary = "Get Receiving Details", description = "Fetch virtual account number, IFSC, and VPA details for a receiver")
    public ResponseEntity<IncomingReceiverResponse> getReceiver(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String receiverId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(incomingPaymentService.getReceiver(userId, receiverId));
    }

    @PostMapping("/receivers/{receiverId}/close")
    @Operation(summary = "Close Virtual Account Receiver", description = "Close a Smart Collect virtual account so it no longer accepts inbound funds")
    public ResponseEntity<IncomingReceiverResponse> closeReceiver(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String receiverId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(incomingPaymentService.closeReceiver(userId, receiverId));
    }

    @PostMapping("/receivers/{receiverId}/sync")
    @Operation(summary = "Sync Receiver Payments", description = "Fetch payments associated with a virtual account directly from Razorpay Smart Collect")
    public ResponseEntity<List<IncomingPaymentResponse>> syncReceiverPayments(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String receiverId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(incomingPaymentService.syncReceiverPayments(userId, receiverId));
    }

    @GetMapping
    @Operation(summary = "List Incoming Payments", description = "Retrieve paginated incoming payments received for the authenticated customer")
    public ResponseEntity<PagedResponse<IncomingPaymentResponse>> listIncomingPayments(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(incomingPaymentService.listIncomingPayments(userId, page, size));
    }

    @GetMapping("/{incomingPaymentId}")
    @Operation(summary = "Get Incoming Payment Details", description = "Retrieve details and credit status of a specific incoming payment")
    public ResponseEntity<IncomingPaymentResponse> getIncomingPayment(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String incomingPaymentId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(incomingPaymentService.getIncomingPayment(userId, incomingPaymentId));
    }
}
