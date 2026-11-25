package com.fintech.payment.controller;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.RefundIncomingPaymentRequest;
import com.fintech.payment.dto.request.ResolveReconciliationRequest;
import com.fintech.payment.dto.request.ReversePaymentRequest;
import com.fintech.payment.dto.response.IncomingPaymentResponse;
import com.fintech.payment.dto.response.OpsDtos.*;
import com.fintech.payment.dto.response.PaymentStatusResponse;
import com.fintech.payment.entity.PaymentAuditLog;
import com.fintech.payment.repository.PaymentAuditLogRepository;
import com.fintech.payment.security.SecurityUtils;
import com.fintech.payment.service.IncomingPaymentService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ops/api/v1/payments")
@Tag(name = "Operations Payment Management", description = "Operations & Admin APIs for reconciliation, reversals, refunds, and audit logs")
@SecurityRequirement(name = "BearerAuth")
@PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN', 'MANAGER')")
public class OpsPaymentController {

    private final ReconciliationService reconciliationService;
    private final PaymentService paymentService;
    private final IncomingPaymentService incomingPaymentService;
    private final PaymentAuditLogRepository auditLogRepository;

    public OpsPaymentController(
            ReconciliationService reconciliationService,
            PaymentService paymentService,
            IncomingPaymentService incomingPaymentService,
            PaymentAuditLogRepository auditLogRepository) {
        this.reconciliationService = reconciliationService;
        this.paymentService = paymentService;
        this.incomingPaymentService = incomingPaymentService;
        this.auditLogRepository = auditLogRepository;
    }

    @PostMapping("/reconciliation/run")
    @Operation(summary = "Run Payment Reconciliation", description = "Reconcile non-terminal outgoing payouts and incoming payments with Razorpay")
    public ResponseEntity<ReconciliationRunSummaryResponse> runReconciliation(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        String actorId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(reconciliationService.runReconciliation(actorId));
    }

    @GetMapping("/reconciliation/discrepancies")
    @Operation(summary = "List Reconciliation Discrepancies", description = "List detected payment discrepancies with optional resolution status filter")
    public ResponseEntity<PagedResponse<ReconciliationRecordResponse>> listDiscrepancies(
            @RequestParam(required = false) String resolutionStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reconciliationService.listDiscrepancies(resolutionStatus, page, size));
    }

    @PostMapping("/reconciliation/discrepancies/{reconciliationId}/resolve")
    @Operation(summary = "Resolve Discrepancy", description = "Mark a reconciliation discrepancy as RESOLVED, WAIVED, or ESCALATED")
    public ResponseEntity<ReconciliationRecordResponse> resolveDiscrepancy(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String reconciliationId,
            @Valid @RequestBody ResolveReconciliationRequest request) {
        String actorId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(reconciliationService.resolveDiscrepancy(reconciliationId, request, actorId));
    }

    @PostMapping("/transfers/{paymentId}/sync")
    @Operation(summary = "Sync Outgoing Transfer (Ops)", description = "Fetch live RazorpayX payout status and update transfer/ledger state")
    public ResponseEntity<PaymentStatusResponse> syncTransfer(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId) {
        return ResponseEntity.ok(paymentService.syncTransferStatus(
                SecurityUtils.getAuthenticatedSubject(jwt), paymentId, true));
    }

    @PostMapping("/transfers/{paymentId}/reverse")
    @Operation(summary = "Reverse Failed/Stuck Transfer (Ops)", description = "Process an approved compensating ledger reversal for a non-completed transfer")
    public ResponseEntity<PaymentStatusResponse> reverseTransfer(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String paymentId,
            @Valid @RequestBody ReversePaymentRequest request) {
        return ResponseEntity.ok(paymentService.reverseTransferByOps(
                paymentId, request.reasonCode(), request.remarks(), SecurityUtils.getAuthenticatedSubject(jwt)));
    }

    @PostMapping("/incoming/{incomingPaymentId}/credit")
    @Operation(summary = "Credit Verified Incoming Payment (Ops)", description = "Execute FinBank ledger credit for an approved/verified incoming payment")
    public ResponseEntity<IncomingPaymentResponse> creditIncomingPayment(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String incomingPaymentId) {
        return ResponseEntity.ok(incomingPaymentService.creditVerifiedIncomingPayment(
                incomingPaymentId, SecurityUtils.getAuthenticatedSubject(jwt)));
    }

    @PostMapping("/incoming/{incomingPaymentId}/refund")
    @Operation(summary = "Refund Incoming Payment (Ops)", description = "Debit FinBank account and initiate Razorpay Smart Collect refund")
    public ResponseEntity<IncomingPaymentResponse> refundIncomingPayment(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String incomingPaymentId,
            @Valid @RequestBody RefundIncomingPaymentRequest request) {
        return ResponseEntity.ok(incomingPaymentService.refundIncomingPayment(
                incomingPaymentId, request, SecurityUtils.getAuthenticatedSubject(jwt)));
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "View Payment Audit Logs", description = "Retrieve immutable audit trail of payment operations")
    public ResponseEntity<PagedResponse<AuditLogResponse>> listAuditLogs(
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) String resourceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int clamped = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<PaymentAuditLog> result = (resourceType != null && resourceId != null)
                ? auditLogRepository.findByResourceTypeAndResourceIdOrderByCreatedAtDesc(
                        resourceType, resourceId, PageRequest.of(Math.max(page, 0), clamped))
                : auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), clamped));
        return ResponseEntity.ok(new PagedResponse<>(
                result.getContent().stream().map(a -> new AuditLogResponse(
                        a.getId(), a.getActorId(), a.getActorRole(), a.getAction(),
                        a.getResourceType(), a.getResourceId(), a.getCorrelationId(),
                        a.getDetails(), a.getCreatedAt())).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext()
        ));
    }
}
