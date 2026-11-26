package com.fintech.loan.controller;

import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.dto.request.RepaymentRequests.ResolveReconciliationRequest;
import com.fintech.loan.dto.request.RepaymentRequests.WaiveChargeRequest;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.dto.response.RepaymentResponses.*;
import com.fintech.loan.enums.ReconciliationStatus;
import com.fintech.loan.enums.RepaymentStatus;
import com.fintech.loan.service.LoanDisbursementService;
import com.fintech.loan.service.LoanReconciliationService;
import com.fintech.loan.service.OverdueAndChargeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/loans/ops")
@Tag(name = "Operations - Repayments & Reconciliation", description = "Staff endpoints for repayment monitoring, overdue management, charge waivers, and reconciliation")
@SecurityRequirement(name = "BearerAuth")
public class LoanOpsRepaymentController {

    private final LoanReconciliationService reconciliationService;
    private final OverdueAndChargeService overdueAndChargeService;
    private final LoanDisbursementService disbursementService;

    public LoanOpsRepaymentController(
            LoanReconciliationService reconciliationService,
            OverdueAndChargeService overdueAndChargeService,
            LoanDisbursementService disbursementService) {
        this.reconciliationService = reconciliationService;
        this.overdueAndChargeService = overdueAndChargeService;
        this.disbursementService = disbursementService;
    }

    @GetMapping("/repayments")
    @Operation(summary = "List All Repayments")
    public ResponseEntity<PagedResponse<RepaymentResponse>> listRepayments(
            @RequestParam(required = false) RepaymentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reconciliationService.listAllRepayments(status, page, size));
    }

    @GetMapping("/repayments/{repaymentId}")
    @Operation(summary = "Get Repayment By ID (Staff)")
    public ResponseEntity<RepaymentResponse> getRepayment(@PathVariable String repaymentId) {
        return ResponseEntity.ok(reconciliationService.getRepaymentById(repaymentId));
    }

    @GetMapping("/overdue-installments")
    @Operation(summary = "List Overdue Installments")
    public ResponseEntity<PagedResponse<InstallmentDetailResponse>> listOverdueInstallments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reconciliationService.listOverdueInstallments(page, size));
    }

    @GetMapping("/failed-repayments")
    @Operation(summary = "List Failed Repayments")
    public ResponseEntity<PagedResponse<RepaymentResponse>> listFailedRepayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reconciliationService.listAllRepayments(RepaymentStatus.FAILED, page, size));
    }

    @GetMapping("/collection-attempts")
    @Operation(summary = "List Collection Attempts")
    public ResponseEntity<PagedResponse<RepaymentAttemptResponse>> listCollectionAttempts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reconciliationService.listCollectionAttempts(page, size));
    }

    @PostMapping("/repayments/{repaymentId}/retry")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER','MANAGER','OPERATIONS','ADMIN')")
    @Operation(summary = "Retry Failed Repayment")
    public ResponseEntity<RepaymentResponse> retryRepayment(@PathVariable String repaymentId) {
        return ResponseEntity.ok(reconciliationService.retryRepayment(repaymentId));
    }

    @PostMapping("/installments/{installmentId}/waive-charge")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER','MANAGER','ADMIN')")
    @Operation(summary = "Waive Installment Charges")
    public ResponseEntity<Void> waiveCharge(
            @PathVariable String installmentId,
            @Valid @RequestBody WaiveChargeRequest request) {
        overdueAndChargeService.waiveInstallmentCharges(
                installmentId, request, SecurityUtils.getAuthenticatedSubject());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/reconciliation")
    @Operation(summary = "List Reconciliation Items")
    public ResponseEntity<PagedResponse<ReconciliationResponse>> listReconciliation(
            @RequestParam(required = false) ReconciliationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reconciliationService.listReconciliations(status, page, size));
    }

    @PostMapping("/reconciliation/{reconciliationId}/resolve")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER','MANAGER','ADMIN')")
    @Operation(summary = "Resolve Reconciliation Item")
    public ResponseEntity<ReconciliationResponse> resolveReconciliation(
            @PathVariable String reconciliationId,
            @Valid @RequestBody ResolveReconciliationRequest request) {
        return ResponseEntity.ok(reconciliationService.resolveReconciliation(
                reconciliationId, request, SecurityUtils.getAuthenticatedSubject()));
    }

    @GetMapping("/disbursement-anomalies")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER','MANAGER','ADMIN')")
    @Operation(summary = "Audit Historical Disbursement Anomalies")
    public ResponseEntity<List<Map<String, Object>>> getDisbursementAnomalies() {
        return ResponseEntity.ok(disbursementService.getHistoricalDisbursementAnomalies());
    }

    @PostMapping("/disbursements/{applicationId}/repair")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER','MANAGER','ADMIN')")
    @Operation(summary = "Safely Repair Historical Disbursed Application Metadata")
    public ResponseEntity<Map<String, Object>> repairHistoricalDisbursement(
            @PathVariable String applicationId) {
        return ResponseEntity.ok(disbursementService.repairHistoricalDisbursedApplication(
                applicationId, SecurityUtils.getAuthenticatedSubject()));
    }
}
