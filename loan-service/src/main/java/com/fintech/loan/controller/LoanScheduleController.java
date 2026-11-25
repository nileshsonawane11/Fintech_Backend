package com.fintech.loan.controller;

import com.fintech.loan.dto.response.RepaymentScheduleResponse;
import com.fintech.loan.service.RepaymentScheduleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/loans")
public class LoanScheduleController {

    private final RepaymentScheduleService repaymentScheduleService;

    public LoanScheduleController(RepaymentScheduleService repaymentScheduleService) {
        this.repaymentScheduleService = repaymentScheduleService;
    }

    @GetMapping("/{loanAccountId}/schedule")
    public ResponseEntity<RepaymentScheduleResponse> getRepaymentSchedule(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String loanAccountId) {
        RepaymentScheduleResponse response = repaymentScheduleService.getSchedule(
                jwt.getSubject(), loanAccountId);
        return ResponseEntity.ok(response);
    }
}
