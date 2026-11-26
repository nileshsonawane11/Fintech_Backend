package com.fintech.loan.controller;

import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.LoanApplicationRequest;
import com.fintech.loan.dto.request.LoanLifecycleRequests.SubmitAdditionalInfoRequest;
import com.fintech.loan.dto.request.LoanLifecycleRequests.TransitionApplicationRequest;
import com.fintech.loan.dto.response.LoanApplicationResponse;
import com.fintech.loan.dto.response.LoanLifecycleResponses.SanctionedOfferDetailsResponse;
import com.fintech.loan.service.LoanApplicationService;
import com.fintech.loan.service.LoanLifecycleService;
import com.fintech.loan.service.LoanOfferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/loans/applications")
@Tag(name = "Customer - Loan Applications", description = "Customer endpoints for applying for loans, tracking status, submitting info, and managing own applications")
@SecurityRequirement(name = "BearerAuth")
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;
    private final LoanLifecycleService lifecycleService;
    private final LoanOfferService offerService;

    public LoanApplicationController(
            LoanApplicationService loanApplicationService,
            LoanLifecycleService lifecycleService,
            LoanOfferService offerService) {
        this.loanApplicationService = loanApplicationService;
        this.lifecycleService = lifecycleService;
        this.offerService = offerService;
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER') or hasAuthority('LOAN_APPLY') or hasRole('ADMIN')")
    @Operation(summary = "Apply for a Loan", description = "Submit a loan application with server-side KYC, Account, Product, Offer, and FOIR validations")
    public ResponseEntity<LoanApplicationResponse> applyForLoan(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody LoanApplicationRequest request) {
        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        LoanApplicationResponse response = loanApplicationService.applyForLoan(request, idempotencyKey, identitySubject);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER') or hasAuthority('LOAN_VIEW_OWN') or hasRole('ADMIN')")
    @Operation(summary = "List My Loan Applications")
    public ResponseEntity<List<LoanApplicationResponse>> listMyApplications(@AuthenticationPrincipal Jwt jwt) {
        String identitySubject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.ok(loanApplicationService.getMyApplications(identitySubject));
    }

    @GetMapping("/{applicationId}")
    @Operation(summary = "Get Loan Application Details")
    public ResponseEntity<LoanApplicationResponse> getApplicationDetails(
            @PathVariable String applicationId,
            @AuthenticationPrincipal Jwt jwt) {
        String subject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isStaff = SecurityUtils.isLoanStaff();
        return ResponseEntity.ok(loanApplicationService.getApplicationDetails(applicationId, subject, isStaff));
    }

    @GetMapping("/{applicationId}/offer")
    @Operation(summary = "Get Sanctioned Offer for Loan Application")
    public ResponseEntity<SanctionedOfferDetailsResponse> getSanctionedOffer(
            @PathVariable String applicationId,
            @AuthenticationPrincipal Jwt jwt) {
        String subject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isStaff = SecurityUtils.isLoanStaff();
        return ResponseEntity.ok(offerService.getSanctionedOfferForApplication(applicationId, subject, isStaff));
    }

    @PostMapping("/{applicationId}/additional-info")
    @PreAuthorize("hasRole('CUSTOMER') or hasAuthority('LOAN_APPLY') or hasRole('ADMIN')")
    @Operation(summary = "Submit Requested Additional Information")
    public ResponseEntity<LoanApplicationResponse> submitAdditionalInfo(
            @PathVariable String applicationId,
            @Valid @RequestBody SubmitAdditionalInfoRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String subject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.ok(lifecycleService.submitAdditionalInfo(applicationId, request, subject));
    }

    @PostMapping("/{applicationId}/cancel")
    @Operation(summary = "Cancel Loan Application")
    public ResponseEntity<LoanApplicationResponse> cancelApplication(
            @PathVariable String applicationId,
            @RequestBody(required = false) TransitionApplicationRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        String subject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        String reason = request != null ? request.reason() : "Cancelled by customer";
        return ResponseEntity.ok(lifecycleService.cancelApplication(
                applicationId, reason, subject, SecurityUtils.resolveActorRole(), SecurityUtils.isLoanStaff()));
    }
}
