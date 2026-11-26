package com.fintech.loan.controller;

import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.dto.response.LoanAccountResponse;
import com.fintech.loan.dto.response.RepaymentScheduleResponse;
import com.fintech.loan.entity.LoanAccount;
import com.fintech.loan.repository.LoanAccountRepository;
import com.fintech.loan.service.RepaymentScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/loans")
@Tag(name = "Loan Accounts & Schedules", description = "View active loan accounts and amortization repayment schedules")
@SecurityRequirement(name = "BearerAuth")
public class LoanScheduleController {

    private final RepaymentScheduleService repaymentScheduleService;
    private final LoanAccountRepository loanAccountRepository;

    public LoanScheduleController(RepaymentScheduleService repaymentScheduleService,
                                  LoanAccountRepository loanAccountRepository) {
        this.repaymentScheduleService = repaymentScheduleService;
        this.loanAccountRepository = loanAccountRepository;
    }

    @GetMapping("/accounts")
    @Operation(summary = "List My Disbursed Loan Accounts")
    public ResponseEntity<List<LoanAccountResponse>> listMyLoanAccounts(@AuthenticationPrincipal Jwt jwt) {
        String subject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        List<LoanAccountResponse> accounts = loanAccountRepository
                .findByIdentitySubjectOrCustomerIdOrderByCreatedAtDesc(subject, subject)
                .stream()
                .map(this::toAccountResponse)
                .toList();
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/{loanAccountId}/schedule")
    @Operation(summary = "Get Loan Repayment Schedule")
    public ResponseEntity<RepaymentScheduleResponse> getRepaymentSchedule(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String loanAccountId) {
        String subject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        boolean isStaff = SecurityUtils.isLoanStaff();
        RepaymentScheduleResponse response = repaymentScheduleService.getSchedule(subject, loanAccountId, isStaff);
        return ResponseEntity.ok(response);
    }

    private LoanAccountResponse toAccountResponse(LoanAccount a) {
        return new LoanAccountResponse(
                a.getLoanAccountId(),
                a.getLoanApplicationId(),
                a.getOfferId(),
                a.getCustomerId(),
                a.getProductCode(),
                a.getDisbursementAccountId(),
                a.getPrincipalAmount(),
                a.getOutstandingPrincipal(),
                a.getInterestRate(),
                a.getTenureMonths(),
                a.getCurrency(),
                a.getEmiAmount(),
                a.getDisbursementDate(),
                a.getNextDueDate(),
                a.getStatus(),
                a.getCreatedAt()
        );
    }
}
