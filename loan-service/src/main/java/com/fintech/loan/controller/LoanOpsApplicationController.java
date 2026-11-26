package com.fintech.loan.controller;

import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.dto.request.LoanLifecycleRequests.*;
import com.fintech.loan.dto.response.LoanApplicationResponse;
import com.fintech.loan.dto.response.LoanLifecycleResponses.LoanDisbursementResponse;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.service.LoanApplicationService;
import com.fintech.loan.service.LoanLifecycleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/loans/ops/applications")
@Tag(name = "Operations & Management - Loan Lifecycle", description = "Role-protected endpoints for Loan Officers, Loan Managers, and Admins to review, verify, approve, reject, and disburse loans")
@SecurityRequirement(name = "BearerAuth")
public class LoanOpsApplicationController {

    private final LoanApplicationService applicationService;
    private final LoanLifecycleService lifecycleService;

    public LoanOpsApplicationController(
            LoanApplicationService applicationService,
            LoanLifecycleService lifecycleService) {
        this.applicationService = applicationService;
        this.lifecycleService = lifecycleService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'LOAN_MANAGER', 'OPERATIONS', 'MANAGER', 'ADMIN')")
    @Operation(summary = "List Loan Applications (Staff Queue)")
    public ResponseEntity<PagedResponse<LoanApplicationResponse>> listApplications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String productCode,
            @RequestParam(required = false) String assignedOfficerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(applicationService.listStaffApplications(status, productCode, assignedOfficerId, page, size));
    }

    @GetMapping("/{applicationId}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'LOAN_MANAGER', 'OPERATIONS', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Get Loan Application Details (Staff)")
    public ResponseEntity<LoanApplicationResponse> getApplication(@PathVariable String applicationId) {
        return ResponseEntity.ok(applicationService.getApplicationDetails(
                applicationId, SecurityUtils.getAuthenticatedSubject(), true));
    }

    @PostMapping("/{applicationId}/assign")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'LOAN_MANAGER', 'OPERATIONS', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Assign Loan Officer")
    public ResponseEntity<LoanApplicationResponse> assignOfficer(
            @PathVariable String applicationId,
            @Valid @RequestBody AssignOfficerRequest request) {
        return ResponseEntity.ok(lifecycleService.assignOfficer(
                applicationId, request, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.resolveActorRole()));
    }

    @PostMapping("/{applicationId}/review")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'LOAN_MANAGER', 'OPERATIONS', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Move Application to UNDER_REVIEW")
    public ResponseEntity<LoanApplicationResponse> startReview(
            @PathVariable String applicationId,
            @RequestBody(required = false) TransitionApplicationRequest request) {
        return ResponseEntity.ok(lifecycleService.moveToUnderReview(
                applicationId, request, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.resolveActorRole()));
    }

    @PostMapping("/{applicationId}/verify-documents")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'LOAN_MANAGER', 'OPERATIONS', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Move Application to DOCUMENT_VERIFICATION")
    public ResponseEntity<LoanApplicationResponse> verifyDocuments(
            @PathVariable String applicationId,
            @RequestBody(required = false) TransitionApplicationRequest request) {
        return ResponseEntity.ok(lifecycleService.moveToDocumentVerification(
                applicationId, request, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.resolveActorRole()));
    }

    @PostMapping("/{applicationId}/request-info")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER', 'LOAN_MANAGER', 'OPERATIONS', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Request Additional Information")
    public ResponseEntity<LoanApplicationResponse> requestAdditionalInfo(
            @PathVariable String applicationId,
            @RequestBody(required = false) TransitionApplicationRequest request) {
        return ResponseEntity.ok(lifecycleService.requestAdditionalInformation(
                applicationId, request, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.resolveActorRole()));
    }

    @PostMapping("/{applicationId}/approve")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Approve Loan Application & Generate Sanctioned Offer")
    public ResponseEntity<LoanApplicationResponse> approveApplication(
            @PathVariable String applicationId,
            @Valid @RequestBody(required = false) ApproveLoanRequest request) {
        return ResponseEntity.ok(lifecycleService.approveApplication(
                applicationId, request, SecurityUtils.getAuthenticatedSubject(),
                SecurityUtils.resolveActorRole(), SecurityUtils.isAdmin()));
    }

    @PostMapping("/{applicationId}/reject")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Reject Loan Application")
    public ResponseEntity<LoanApplicationResponse> rejectApplication(
            @PathVariable String applicationId,
            @Valid @RequestBody RejectLoanRequest request) {
        return ResponseEntity.ok(lifecycleService.rejectApplication(
                applicationId, request, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.resolveActorRole()));
    }

    @PostMapping("/{applicationId}/disbursement/initiate")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Initiate Loan Disbursement (DISBURSEMENT_PENDING)")
    public ResponseEntity<LoanApplicationResponse> initiateDisbursement(
            @PathVariable String applicationId,
            @RequestBody(required = false) TransitionApplicationRequest request) {
        return ResponseEntity.ok(lifecycleService.initiateDisbursement(
                applicationId,
                request != null ? request.remarks() : null,
                SecurityUtils.getAuthenticatedSubject(),
                SecurityUtils.resolveActorRole()));
    }

    @PostMapping("/{applicationId}/disburse")
    @PreAuthorize("hasAnyRole('LOAN_MANAGER', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Complete Loan Disbursement & Generate Repayment Schedule")
    public ResponseEntity<LoanDisbursementResponse> disburseLoan(
            @PathVariable String applicationId,
            @RequestBody(required = false) TransitionApplicationRequest request) {
        return ResponseEntity.ok(lifecycleService.disburseLoan(
                applicationId,
                request != null ? request.remarks() : null,
                SecurityUtils.getAuthenticatedSubject(),
                SecurityUtils.resolveActorRole()));
    }
}
