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
@Tag(name = "Internal Payment Collections & Mandates", description = "Internal service APIs for external payment collection and recurring mandates")
public class InternalPaymentCollectionController {

    private final InternalPaymentCollectionService collectionService;

    public InternalPaymentCollectionController(InternalPaymentCollectionService collectionService) {
        this.collectionService = collectionService;
    }

    @PostMapping("/collections")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    @Operation(summary = "Initiate External Collection", description = "Initiate UPI/NetBanking/Card/AutoPay/eNACH collection; returns PENDING until webhook/status confirmation")
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

    @PostMapping("/mandates")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    @Operation(summary = "Register External Recurring Mandate", description = "Register UPI AutoPay or eNACH mandate in PENDING state pending provider confirmation")
    public ResponseEntity<MandateRegistrationResponse> registerMandate(
            @RequestHeader(value = PaymentConstants.HEADER_IDEMPOTENCY_KEY, required = false) String idempotencyKey,
            @Valid @RequestBody RegisterMandateRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(collectionService.registerMandate(idempotencyKey, request));
    }

    @GetMapping("/mandates/{providerReference}/status")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    public ResponseEntity<MandateRegistrationResponse> getMandateStatus(@PathVariable String providerReference) {
        return ResponseEntity.ok(collectionService.getMandateStatus(providerReference));
    }

    @PostMapping("/mandates/{providerReference}/pause")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    public ResponseEntity<MandateRegistrationResponse> pauseMandate(@PathVariable String providerReference) {
        return ResponseEntity.ok(collectionService.pauseMandate(providerReference));
    }

    @PostMapping("/mandates/{providerReference}/resume")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    public ResponseEntity<MandateRegistrationResponse> resumeMandate(@PathVariable String providerReference) {
        return ResponseEntity.ok(collectionService.resumeMandate(providerReference));
    }

    @PostMapping("/mandates/{providerReference}/revoke")
    @PreAuthorize("hasAnyRole('SYSTEM','INTERNAL')")
    public ResponseEntity<MandateRegistrationResponse> revokeMandate(@PathVariable String providerReference) {
        return ResponseEntity.ok(collectionService.revokeMandate(providerReference));
    }
}
