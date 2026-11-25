package com.fintech.loan.controller;

import com.fintech.loan.dto.response.LoanProductListResponse;
import com.fintech.loan.service.LoanProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/loans/products")
public class LoanProductController {

    private final LoanProductService loanProductService;

    public LoanProductController(LoanProductService loanProductService) {
        this.loanProductService = loanProductService;
    }

    @GetMapping
    public ResponseEntity<LoanProductListResponse> listProducts(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String loanType) {
        LoanProductListResponse response = loanProductService.getProducts(loanType);
        return ResponseEntity.ok(response);
    }
}
