package com.fintech.payment.controller;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.RefundPaymentRequest;
import com.fintech.payment.dto.request.ResolveReconciliationRequest;
import com.fintech.payment.dto.response.OpsDtos.*;
import com.fintech.payment.dto.response.PaymentTransactionResponse;
import com.fintech.payment.dto.response.RefundResponse;
import com.fintech.payment.entity.PaymentAuditLog;
import com.fintech.payment.repository.PaymentAuditLogRepository;
import com.fintech.payment.security.SecurityUtils;
import com.fintech.payment.service.PaymentService;
import com.fintech.payment.service.ReconciliationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ops/api/v1/payments")
@Tag(name = "Operations - Payments", description = "Operations endpoints for Razorpay order reconciliation, manual sync, refunds, and audit logs")
@SecurityRequirement(name = "BearerAuth")
public class OpsPaymentController {

    private final ReconciliationService reconciliationService;
    private final PaymentService paymentService;
    private final PaymentAuditLogRepository auditLogRepository;

    public OpsPaymentController(
            ReconciliationService reconciliationService,
            PaymentService paymentService,
            PaymentAuditLogRepository auditLogRepository) {
        this.reconciliationService = reconciliationService;
        this.paymentService = paymentService;
        this.auditLogRepository = auditLogRepository;
    }

    @PostMapping("/reconciliation/run")
    @Operation(summary = "Run Reconciliation", description = "Trigger on-demand reconciliation for pending Razorpay orders")
    public ResponseEntity<ReconciliationRunSummaryResponse> runReconciliation(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        String actorId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(reconciliationService.runReconciliation(actorId));
    }

    @GetMapping("/reconciliation/discrepancies")
    @Operation(summary = "List Reconciliation Discrepancies")
    public ResponseEntity<PagedResponse<ReconciliationRecordResponse>> listDiscrepancies(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reconciliationService.listDiscrepancies(status, page, size));
    }

    @PostMapping("/reconciliation/discrepancies/{reconciliationId}/resolve")
    @Operation(summary = "Resolve Reconciliation Discrepancy")
    public ResponseEntity<ReconciliationRecordResponse> resolveDiscrepancy(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String reconciliationId,
            @Valid @RequestBody ResolveReconciliationRequest request) {
        String actorId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(reconciliationService.resolveDiscrepancy(actorId, reconciliationId, request));
    }

    @PostMapping("/orders/{paymentId}/sync")
    @Operation(summary = "Force Sync Payment Order", description = "Poll Razorpay Orders API for latest payment status")
    public ResponseEntity<PaymentTransactionResponse> syncPayment(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {
        String actorId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.syncPaymentStatus(actorId, paymentId, true));
    }

    @PostMapping("/orders/{paymentId}/refund")
    @Operation(summary = "Operations Refund", description = "Initiate full or partial Razorpay refund from Operations")
    public ResponseEntity<RefundResponse> refundPayment(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(PaymentConstants.HEADER_IDEMPOTENCY_KEY) String idempotencyKey,
            @PathVariable String paymentId,
            @Valid @RequestBody RefundPaymentRequest request) {
        String actorId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(paymentService.initiateRefund(actorId, idempotencyKey, paymentId, request, true));
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "List Payment Audit Logs")
    public ResponseEntity<PagedResponse<AuditLogResponse>> listAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<PaymentAuditLog> result = auditLogRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(Math.max(page, 0), safeSize));
        var items = result.getContent().stream()
                .map(a -> new AuditLogResponse(
                        a.getId().toString(),
                        a.getActorId(),
                        a.getActorRole(),
                        a.getAction(),
                        a.getResourceType(),
                        a.getResourceId(),
                        a.getCorrelationId(),
                        a.getDetails(),
                        a.getCreatedAt()
                ))
                .toList();
        return ResponseEntity.ok(new PagedResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.hasNext()));
    }
}
