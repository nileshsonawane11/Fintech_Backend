package com.fintech.investment.controller;

import com.fintech.investment.dto.InvestmentDtos.*;
import com.fintech.investment.service.InvestmentApplicationService;
import com.fintech.investment.service.InvestmentOpsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/investments/ops")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATIONS')")
@Tag(name = "Investment Operations", description = "Staff operations dashboard, application approvals, document verification, and alerts")
public class InvestmentOpsController {

    private final InvestmentOpsService opsService;
    private final InvestmentApplicationService applicationService;

    public InvestmentOpsController(InvestmentOpsService opsService, InvestmentApplicationService applicationService) {
        this.opsService = opsService;
        this.applicationService = applicationService;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get operational monitoring dashboard")
    public OpsDashboardResponse getDashboard() {
        return opsService.getOpsDashboard();
    }

    @PostMapping("/applications/{applicationId}/approve")
    @Operation(summary = "Approve and book a pending investment application")
    public InvestmentResponse approve(@PathVariable String applicationId,
                                      @RequestBody(required = false) @Valid StaffDecisionRequest request) {
        return applicationService.approveAndBookByStaff(applicationId, request);
    }

    @PostMapping("/applications/{applicationId}/reject")
    @Operation(summary = "Reject a pending investment application")
    public ApplicationResponse reject(@PathVariable String applicationId,
                                      @RequestBody(required = false) @Valid StaffDecisionRequest request) {
        return applicationService.rejectApplication(applicationId, request);
    }

    @PostMapping("/documents/{documentId}/verify")
    @Operation(summary = "Verify or reject a submitted investment document")
    public DocumentResponse verifyDocument(@PathVariable String documentId,
                                           @RequestParam boolean approved,
                                           @RequestParam(required = false) String remarks) {
        return opsService.verifyDocument(documentId, approved, remarks);
    }

    @PostMapping("/alerts/{alertId}/resolve")
    @Operation(summary = "Resolve an operational alert")
    public void resolveAlert(@PathVariable String alertId) {
        opsService.resolveOpsAlert(alertId);
    }
}
