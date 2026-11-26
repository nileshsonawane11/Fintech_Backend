package com.fintech.loan.controller;

import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.dto.request.AcceptLoanOfferRequest;
import com.fintech.loan.dto.response.AcceptOfferResponse;
import com.fintech.loan.dto.response.DynamicOfferResponses.DynamicOfferResponse;
import com.fintech.loan.service.DynamicLoanOfferService;
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
@RequestMapping("/api/v1/loans/offers")
@Tag(name = "Customer - Loan Offers", description = "Browse active promotional loan offers and accept sanctioned loan offers")
public class LoanOfferController {

    private final LoanOfferService loanOfferService;
    private final DynamicLoanOfferService dynamicOfferService;

    public LoanOfferController(LoanOfferService loanOfferService, DynamicLoanOfferService dynamicOfferService) {
        this.loanOfferService = loanOfferService;
        this.dynamicOfferService = dynamicOfferService;
    }

    @GetMapping("/active")
    @Operation(summary = "List Currently Active Loan Offers")
    public ResponseEntity<List<DynamicOfferResponse>> listActiveOffers(
            @RequestParam(required = false) String productCode) {
        return ResponseEntity.ok(dynamicOfferService.getActiveOffersForProduct(productCode != null ? productCode : ""));
    }

    @PostMapping("/{offerId}/accept")
    @SecurityRequirement(name = "BearerAuth")
    @PreAuthorize("hasRole('CUSTOMER') or hasAuthority('LOAN_OFFER_ACCEPT') or hasRole('ADMIN')")
    @Operation(summary = "Accept Sanctioned Loan Offer")
    public ResponseEntity<AcceptOfferResponse> acceptOffer(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String offerId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody AcceptLoanOfferRequest request) {
        String subject = jwt != null ? jwt.getSubject() : SecurityUtils.getAuthenticatedSubject();
        AcceptOfferResponse response = loanOfferService.acceptOffer(subject, offerId, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}
