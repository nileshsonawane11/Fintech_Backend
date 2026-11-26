package com.fintech.loan.controller;

import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.RepaymentRequests.*;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.dto.response.RepaymentResponses.*;
import com.fintech.loan.dto.response.RepaymentScheduleResponse;
import com.fintech.loan.enums.RepaymentStatus;
import com.fintech.loan.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/loans")
@Tag(name = "Customer - Loan Repayments", description = "Repayment accounts, mandates, EMI dues, manual repayments, prepayments, and foreclosure")
@SecurityRequirement(name = "BearerAuth")
public class LoanRepaymentController {

    private final RepaymentAccountService repaymentAccountService;
    private final RepaymentMandateService mandateService;
    private final RepaymentScheduleService scheduleService;
    private final LoanRepaymentService repaymentService;
    private final PrepaymentForeclosureService prepaymentForeclosureService;

    public LoanRepaymentController(
            RepaymentAccountService repaymentAccountService,
            RepaymentMandateService mandateService,
            RepaymentScheduleService scheduleService,
            LoanRepaymentService repaymentService,
            PrepaymentForeclosureService prepaymentForeclosureService) {
        this.repaymentAccountService = repaymentAccountService;
        this.mandateService = mandateService;
        this.scheduleService = scheduleService;
        this.repaymentService = repaymentService;
        this.prepaymentForeclosureService = prepaymentForeclosureService;
    }

    // ==================== REPAYMENT ACCOUNTS ====================

    @PostMapping("/{loanAccountId}/repayment-accounts")
    @Operation(summary = "Register Repayment Account")
    public ResponseEntity<RepaymentAccountResponse> addRepaymentAccount(
            @PathVariable String loanAccountId,
            @Valid @RequestBody RegisterRepaymentAccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(repaymentAccountService.addRepaymentAccount(
                        loanAccountId, request, SecurityUtils.getAuthenticatedSubject()));
    }

    @GetMapping("/{loanAccountId}/repayment-accounts")
    @Operation(summary = "List Repayment Accounts")
    public ResponseEntity<List<RepaymentAccountResponse>> listRepaymentAccounts(@PathVariable String loanAccountId) {
        return ResponseEntity.ok(repaymentAccountService.listRepaymentAccounts(
                loanAccountId, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    @PutMapping("/{loanAccountId}/repayment-accounts/{repaymentAccountId}/primary")
    @Operation(summary = "Set Primary Repayment Account")
    public ResponseEntity<RepaymentAccountResponse> setPrimaryRepaymentAccount(
            @PathVariable String loanAccountId,
            @PathVariable String repaymentAccountId) {
        return ResponseEntity.ok(repaymentAccountService.setPrimaryRepaymentAccount(
                loanAccountId, repaymentAccountId, SecurityUtils.getAuthenticatedSubject()));
    }

    @DeleteMapping("/{loanAccountId}/repayment-accounts/{repaymentAccountId}")
    @Operation(summary = "Remove/Deactivate Repayment Account")
    public ResponseEntity<Void> removeRepaymentAccount(
            @PathVariable String loanAccountId,
            @PathVariable String repaymentAccountId) {
        repaymentAccountService.deactivateRepaymentAccount(
                loanAccountId, repaymentAccountId, SecurityUtils.getAuthenticatedSubject());
        return ResponseEntity.noContent().build();
    }

    // ==================== REPAYMENT MANDATES ====================

    @PostMapping("/{loanAccountId}/repayment-mandates")
    @Operation(summary = "Create Repayment Mandate")
    public ResponseEntity<MandateResponse> createMandate(
            @PathVariable String loanAccountId,
            @RequestHeader(value = LoanConstants.HEADER_IDEMPOTENCY_KEY, required = false) String idempotencyKey,
            @Valid @RequestBody CreateMandateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(mandateService.createMandate(
                        loanAccountId, request, idempotencyKey, SecurityUtils.getAuthenticatedSubject()));
    }

    @GetMapping("/{loanAccountId}/repayment-mandates")
    @Operation(summary = "List Repayment Mandates")
    public ResponseEntity<List<MandateResponse>> listMandates(@PathVariable String loanAccountId) {
        return ResponseEntity.ok(mandateService.listMandates(
                loanAccountId, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    @GetMapping("/{loanAccountId}/repayment-mandates/{mandateId}")
    @Operation(summary = "Get Repayment Mandate Details")
    public ResponseEntity<MandateResponse> getMandate(
            @PathVariable String loanAccountId,
            @PathVariable String mandateId) {
        return ResponseEntity.ok(mandateService.getMandate(
                loanAccountId, mandateId, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    @PostMapping("/{loanAccountId}/repayment-mandates/{mandateId}/pause")
    @Operation(summary = "Pause Repayment Mandate")
    public ResponseEntity<MandateResponse> pauseMandate(
            @PathVariable String loanAccountId,
            @PathVariable String mandateId) {
        return ResponseEntity.ok(mandateService.pauseMandate(
                loanAccountId, mandateId, SecurityUtils.getAuthenticatedSubject()));
    }

    @PostMapping("/{loanAccountId}/repayment-mandates/{mandateId}/resume")
    @Operation(summary = "Resume Repayment Mandate")
    public ResponseEntity<MandateResponse> resumeMandate(
            @PathVariable String loanAccountId,
            @PathVariable String mandateId) {
        return ResponseEntity.ok(mandateService.resumeMandate(
                loanAccountId, mandateId, SecurityUtils.getAuthenticatedSubject()));
    }

    @PostMapping("/{loanAccountId}/repayment-mandates/{mandateId}/revoke")
    @Operation(summary = "Revoke Repayment Mandate")
    public ResponseEntity<MandateResponse> revokeMandate(
            @PathVariable String loanAccountId,
            @PathVariable String mandateId) {
        return ResponseEntity.ok(mandateService.revokeMandate(
                loanAccountId, mandateId, SecurityUtils.getAuthenticatedSubject()));
    }

    // ==================== SCHEDULE, DUES & SUMMARY ====================

    @GetMapping("/{loanAccountId}/repayment-schedule")
    @Operation(summary = "Get Loan Repayment Schedule")
    public ResponseEntity<RepaymentScheduleResponse> getRepaymentSchedule(@PathVariable String loanAccountId) {
        return ResponseEntity.ok(scheduleService.getSchedule(
                SecurityUtils.getAuthenticatedSubject(), loanAccountId, SecurityUtils.isLoanStaff()));
    }

    @GetMapping("/{loanAccountId}/repayment-summary")
    @Operation(summary = "Get Loan Repayment Summary")
    public ResponseEntity<LoanRepaymentSummaryResponse> getRepaymentSummary(@PathVariable String loanAccountId) {
        return ResponseEntity.ok(repaymentService.getSummary(
                loanAccountId, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    @GetMapping("/{loanAccountId}/dues")
    @Operation(summary = "Get Outstanding Dues")
    public ResponseEntity<List<InstallmentDetailResponse>> getDues(@PathVariable String loanAccountId) {
        return ResponseEntity.ok(repaymentService.getDues(
                loanAccountId, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    @GetMapping("/{loanAccountId}/upcoming-installments")
    @Operation(summary = "Get Upcoming Installments")
    public ResponseEntity<List<InstallmentDetailResponse>> getUpcomingInstallments(@PathVariable String loanAccountId) {
        return ResponseEntity.ok(repaymentService.getUpcomingInstallments(
                loanAccountId, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    // ==================== MANUAL REPAYMENTS & RECEIPTS ====================

    @PostMapping("/{loanAccountId}/repayments")
    @Operation(summary = "Make Manual Loan Repayment")
    public ResponseEntity<RepaymentResponse> makeRepayment(
            @PathVariable String loanAccountId,
            @RequestHeader(LoanConstants.HEADER_IDEMPOTENCY_KEY) String idempotencyKey,
            @Valid @RequestBody ManualRepaymentRequest request) {
        RepaymentResponse response = repaymentService.initiateManualRepayment(
                loanAccountId, request, idempotencyKey, SecurityUtils.getAuthenticatedSubject());
        HttpStatus status = response.repaymentStatus() == RepaymentStatus.SUCCESS
                ? HttpStatus.OK
                : HttpStatus.ACCEPTED;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/{loanAccountId}/repayments")
    @Operation(summary = "List Loan Repayments")
    public ResponseEntity<PagedResponse<RepaymentResponse>> listRepayments(
            @PathVariable String loanAccountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(repaymentService.listRepayments(
                loanAccountId, page, size, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    @GetMapping("/{loanAccountId}/repayments/{repaymentId}")
    @Operation(summary = "Get Repayment Status")
    public ResponseEntity<RepaymentResponse> getRepayment(
            @PathVariable String loanAccountId,
            @PathVariable String repaymentId) {
        return ResponseEntity.ok(repaymentService.getRepayment(
                loanAccountId, repaymentId, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    @GetMapping("/{loanAccountId}/repayments/{repaymentId}/receipt")
    @Operation(summary = "Get Repayment Receipt")
    public ResponseEntity<RepaymentReceiptResponse> getReceipt(
            @PathVariable String loanAccountId,
            @PathVariable String repaymentId) {
        return ResponseEntity.ok(repaymentService.getReceipt(
                loanAccountId, repaymentId, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    @GetMapping("/{loanAccountId}/repayment-history")
    @Operation(summary = "Get Repayment History")
    public ResponseEntity<PagedResponse<RepaymentResponse>> getRepaymentHistory(
            @PathVariable String loanAccountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(repaymentService.listRepayments(
                loanAccountId, page, size, SecurityUtils.getAuthenticatedSubject(), SecurityUtils.isLoanStaff()));
    }

    // ==================== PREPAYMENT & FORECLOSURE ====================

    @PostMapping("/{loanAccountId}/prepayment-quote")
    @Operation(summary = "Get Part-Prepayment Quote")
    public ResponseEntity<PrepaymentQuoteResponse> getPrepaymentQuote(
            @PathVariable String loanAccountId,
            @Valid @RequestBody PrepaymentQuoteRequest request) {
        return ResponseEntity.ok(prepaymentForeclosureService.quotePartPrepayment(
                loanAccountId, request, SecurityUtils.getAuthenticatedSubject()));
    }

    @PostMapping("/{loanAccountId}/prepayments")
    @Operation(summary = "Execute Part-Prepayment")
    public ResponseEntity<RepaymentResponse> executePrepayment(
            @PathVariable String loanAccountId,
            @RequestHeader(LoanConstants.HEADER_IDEMPOTENCY_KEY) String idempotencyKey,
            @Valid @RequestBody ExecutePrepaymentRequest request) {
        RepaymentResponse response = prepaymentForeclosureService.executePartPrepayment(
                loanAccountId, request, idempotencyKey, SecurityUtils.getAuthenticatedSubject());
        return ResponseEntity.status(response.repaymentStatus() == RepaymentStatus.SUCCESS ? HttpStatus.OK : HttpStatus.ACCEPTED)
                .body(response);
    }

    @PostMapping("/{loanAccountId}/foreclosure-quote")
    @Operation(summary = "Get Foreclosure Quote")
    public ResponseEntity<ForeclosureQuoteResponse> getForeclosureQuote(
            @PathVariable String loanAccountId,
            @RequestBody(required = false) ForeclosureQuoteRequest request) {
        return ResponseEntity.ok(prepaymentForeclosureService.quoteForeclosure(
                loanAccountId, request, SecurityUtils.getAuthenticatedSubject()));
    }

    @PostMapping("/{loanAccountId}/foreclosure")
    @Operation(summary = "Execute Loan Foreclosure")
    public ResponseEntity<RepaymentResponse> executeForeclosure(
            @PathVariable String loanAccountId,
            @RequestHeader(LoanConstants.HEADER_IDEMPOTENCY_KEY) String idempotencyKey,
            @Valid @RequestBody ExecuteForeclosureRequest request) {
        RepaymentResponse response = prepaymentForeclosureService.executeForeclosure(
                loanAccountId, request, idempotencyKey, SecurityUtils.getAuthenticatedSubject());
        return ResponseEntity.status(response.repaymentStatus() == RepaymentStatus.SUCCESS ? HttpStatus.OK : HttpStatus.ACCEPTED)
                .body(response);
    }
}
