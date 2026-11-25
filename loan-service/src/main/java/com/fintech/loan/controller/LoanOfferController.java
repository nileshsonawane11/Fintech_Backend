package com.fintech.loan.controller;

import com.fintech.loan.dto.request.AcceptLoanOfferRequest;
import com.fintech.loan.dto.response.AcceptOfferResponse;
import com.fintech.loan.service.LoanOfferService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/loans/offers")
public class LoanOfferController {

    private final LoanOfferService loanOfferService;

    public LoanOfferController(LoanOfferService loanOfferService) {
        this.loanOfferService = loanOfferService;
    }

    @PostMapping("/{offerId}/accept")
    public ResponseEntity<AcceptOfferResponse> acceptOffer(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String offerId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody AcceptLoanOfferRequest request) {
        AcceptOfferResponse response = loanOfferService.acceptOffer(
                jwt.getSubject(), offerId, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}
