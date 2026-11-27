package com.fintech.investment.controller;

import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.dto.InvestmentDtos.*;
import com.fintech.investment.service.InvestmentLifecycleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/investments")
@Tag(name = "Customer Investments", description = "Active investment holdings, certificates, schedules, SIP management, SSY deposits, and withdrawals")
public class InvestmentController {

    private final InvestmentLifecycleService lifecycleService;

    public InvestmentController(InvestmentLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List authenticated customer's investments")
    public List<InvestmentResponse> myInvestments() {
        return lifecycleService.getMyInvestments();
    }

    @GetMapping("/{investmentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get investment details (ownership verified)")
    public InvestmentResponse getInvestment(@PathVariable String investmentId) {
        return lifecycleService.getInvestment(investmentId);
    }

    @GetMapping("/{investmentId}/certificate")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get deposit/investment certificate")
    public CertificateResponse getCertificate(@PathVariable String investmentId) {
        return lifecycleService.getCertificate(investmentId);
    }

    @GetMapping("/{investmentId}/schedules")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get RD or SIP instalment schedule")
    public List<InstallmentScheduleResponse> getSchedules(@PathVariable String investmentId) {
        return lifecycleService.getSchedules(investmentId);
    }

    @GetMapping("/{investmentId}/transactions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get investment transaction statement")
    public List<TransactionResponse> getTransactions(@PathVariable String investmentId) {
        return lifecycleService.getTransactions(investmentId);
    }

    @PatchMapping("/{investmentId}/auto-renewal")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update FD auto-renewal and maturity instructions")
    public InvestmentResponse updateAutoRenewal(@PathVariable String investmentId,
                                                @Valid @RequestBody AutoRenewalRequest request) {
        return lifecycleService.updateAutoRenewal(investmentId, request);
    }

    @PostMapping("/{investmentId}/sip/pause")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Pause an active SIP")
    public InvestmentResponse pauseSip(@PathVariable String investmentId) {
        return lifecycleService.pauseSip(investmentId);
    }

    @PostMapping("/{investmentId}/sip/resume")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Resume a paused SIP")
    public InvestmentResponse resumeSip(@PathVariable String investmentId) {
        return lifecycleService.resumeSip(investmentId);
    }

    @PutMapping("/{investmentId}/sip")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Modify SIP monthly amount, debit day, or fund category")
    public InvestmentResponse modifySip(@PathVariable String investmentId,
                                        @Valid @RequestBody SipModifyRequest request) {
        return lifecycleService.modifySip(investmentId, request);
    }

    @PostMapping("/{investmentId}/sip/cancel")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel a SIP")
    public InvestmentResponse cancelSip(@PathVariable String investmentId) {
        return lifecycleService.cancelSip(investmentId);
    }

    @PostMapping("/{investmentId}/ssy/deposits")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Make an additional annual SSY deposit (enforces Rs. 1,50,000 annual limit)")
    public TransactionResponse depositSsy(
            @PathVariable String investmentId,
            @Valid @RequestBody SsyDepositRequest request,
            @RequestHeader(value = InvestmentConstants.HEADER_IDEMPOTENCY_KEY, required = false) String idempotencyKey) {
        return lifecycleService.depositSsy(investmentId, request, idempotencyKey);
    }

    @PostMapping("/{investmentId}/withdrawals")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Request premature closure, partial withdrawal (e.g. SSY education), or maturity payout")
    public WithdrawalResponse requestWithdrawal(@PathVariable String investmentId,
                                                @Valid @RequestBody WithdrawalRequestDto request) {
        return lifecycleService.requestWithdrawalOrClosure(investmentId, request);
    }
}
