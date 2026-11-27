package com.fintech.payment.controller;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.internal.InternalPaymentDtos.*;
import com.fintech.payment.service.InternalPaymentCollectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/api/v1/payments")
@Tag(name = "Internal Payment Collections", description = "Internal service APIs for Razorpay Orders external payment collection")
public class InternalPaymentCollectionController {

    private final InternalPaymentCollectionService collectionService;

    public InternalPaymentCollectionController(InternalPaymentCollectionService collectionService) {
        this.collectionService = collectionService;
    }

    @PostMapping("/collections")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    @Operation(summary = "Initiate External Collection Order",
            description = "Create a Razorpay Order for external collection; returns PENDING until Checkout verification/webhook confirmation")
    public ResponseEntity<CollectionOrderResponse> initiateCollection(
            @RequestHeader(value = PaymentConstants.HEADER_IDEMPOTENCY_KEY, required = false) String idempotencyKey,
            @Valid @RequestBody InitiateCollectionRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(collectionService.initiateCollection(idempotencyKey, request));
    }

    @GetMapping("/collections/{collectionReference}/status")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    @Operation(summary = "Get External Collection Status")
    public ResponseEntity<CollectionOrderResponse> getCollectionStatus(@PathVariable String collectionReference) {
        return ResponseEntity.ok(collectionService.getCollectionStatus(collectionReference));
    }

    @PostMapping("/collections/{collectionReference}/refund")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    @Operation(summary = "Refund External Collection")
    public ResponseEntity<CollectionOrderResponse> refundCollection(
            @PathVariable String collectionReference,
            @Valid @RequestBody RefundCollectionRequest request) {
        return ResponseEntity.ok(collectionService.refundCollection(collectionReference, request));
    }
}
