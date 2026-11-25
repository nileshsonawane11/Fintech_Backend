package com.fintech.loan.controller;

import com.fintech.loan.dto.request.LoanApplicationRequest;
import com.fintech.loan.dto.response.LoanApplicationResponse;
import com.fintech.loan.service.LoanApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/loans/applications")
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;

    public LoanApplicationController(LoanApplicationService loanApplicationService) {
        this.loanApplicationService = loanApplicationService;
    }

    @PostMapping
    public ResponseEntity<LoanApplicationResponse> applyForLoan(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody LoanApplicationRequest request) {
        String customerId = jwt.getSubject();
        LoanApplicationResponse response = loanApplicationService.applyForLoan(request, idempotencyKey, customerId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}
