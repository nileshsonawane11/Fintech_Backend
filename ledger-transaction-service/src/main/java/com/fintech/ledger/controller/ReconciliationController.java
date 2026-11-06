package com.fintech.ledger.controller;

import com.fintech.ledger.dto.request.ReconciliationRunRequest;
import com.fintech.ledger.dto.request.ResolveDiscrepancyRequest;
import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.dto.response.DiscrepancyResponse;
import com.fintech.ledger.dto.response.ReconciliationRunResponse;
import com.fintech.ledger.enums.DiscrepancyStatus;
import com.fintech.ledger.enums.DiscrepancyType;
import com.fintech.ledger.enums.ReconciliationStatus;
import com.fintech.ledger.enums.ReconciliationType;
import com.fintech.ledger.security.SecurityUtils;
import com.fintech.ledger.service.ReconciliationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/ops/api/v1/reconciliation")
@Tag(name = "Reconciliation", description = "Financial integrity checks, trial balance verification, and discrepancy resolution")
@SecurityRequirement(name = "BearerAuth")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    public ReconciliationController(ReconciliationService reconciliationService) {
        this.reconciliationService = reconciliationService;
    }

    @PostMapping("/runs")
    @Operation(summary = "Run Ledger Reconciliation", description = "Execute financial audit verifying trial balance equality, snapshot accuracy, and hold consistency")
    @PreAuthorize("hasAuthority('RECONCILIATION_RUN') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ReconciliationRunResponse> runReconciliation(
            @Valid @RequestBody ReconciliationRunRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String initiatedBy = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        ReconciliationRunResponse response = reconciliationService.triggerReconciliation(request, initiatedBy);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/runs/{reconciliationId}")
    @Operation(summary = "Get Reconciliation Run", description = "Retrieve detailed results and discrepancy counts of a reconciliation execution")
    @PreAuthorize("hasAuthority('RECONCILIATION_READ') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ReconciliationRunResponse> getReconciliationRun(
            @Parameter(description = "Reconciliation ID") @PathVariable String reconciliationId) {

        ReconciliationRunResponse response = reconciliationService.getReconciliationRun(reconciliationId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/runs")
    @Operation(summary = "List Reconciliation Runs", description = "List historical reconciliation execution reports")
    @PreAuthorize("hasAuthority('RECONCILIATION_READ') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CursorPagedResponse<ReconciliationRunResponse>> listReconciliationRuns(
            @Parameter(description = "Filter by status") @RequestParam(required = false) ReconciliationStatus status,
            @Parameter(description = "Filter by type") @RequestParam(required = false) ReconciliationType reconciliationType,
            @Parameter(description = "Filter from date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromDate,
            @Parameter(description = "Filter to date") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toDate,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<ReconciliationRunResponse> response = reconciliationService.listReconciliationRuns(
                status, reconciliationType, fromDate, toDate, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/discrepancies")
    @Operation(summary = "List Reconciliation Discrepancies", description = "Inspect all detected accounting or balance discrepancies")
    @PreAuthorize("hasAuthority('RECONCILIATION_READ') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<CursorPagedResponse<DiscrepancyResponse>> listDiscrepancies(
            @Parameter(description = "Filter by run ID") @RequestParam(required = false) String reconciliationId,
            @Parameter(description = "Filter by account reference") @RequestParam(required = false) String accountId,
            @Parameter(description = "Filter by discrepancy type") @RequestParam(required = false) DiscrepancyType discrepancyType,
            @Parameter(description = "Filter by status") @RequestParam(required = false) DiscrepancyStatus status,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<DiscrepancyResponse> response = reconciliationService.listDiscrepancies(
                reconciliationId, accountId, discrepancyType, status, limit, cursor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/discrepancies/{discrepancyId}")
    @Operation(summary = "Get Discrepancy Details", description = "Detailed audit record of an individual financial discrepancy")
    @PreAuthorize("hasAuthority('RECONCILIATION_READ') or hasRole('OPERATIONS') or hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<DiscrepancyResponse> getDiscrepancyDetails(
            @Parameter(description = "Discrepancy UUID") @PathVariable UUID discrepancyId) {

        DiscrepancyResponse response = reconciliationService.getDiscrepancyDetails(discrepancyId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/discrepancies/{discrepancyId}/resolve")
    @Operation(summary = "Resolve Discrepancy", description = "Acknowledge and mark a discrepancy as resolved with audit comments (never alters immutable ledger)")
    @PreAuthorize("hasAuthority('RECONCILIATION_RESOLVE') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<DiscrepancyResponse> resolveDiscrepancy(
            @Parameter(description = "Discrepancy UUID") @PathVariable UUID discrepancyId,
            @Valid @RequestBody ResolveDiscrepancyRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String resolvedBy = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        DiscrepancyResponse response = reconciliationService.resolveDiscrepancy(discrepancyId, request, resolvedBy);
        return ResponseEntity.ok(response);
    }
}
