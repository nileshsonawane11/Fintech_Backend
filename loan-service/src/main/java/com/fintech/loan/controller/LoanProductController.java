package com.fintech.loan.controller;

import com.fintech.loan.dto.response.DynamicOfferResponses.DynamicOfferResponse;
import com.fintech.loan.dto.response.LoanProductListResponse;
import com.fintech.loan.dto.response.LoanProductResponses.*;
import com.fintech.loan.service.LoanProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/loans/products")
@Tag(name = "Public - Loan Products", description = "Public and customer-facing endpoints to inspect active loan products, rates, fees, eligibility, and offers")
public class LoanProductController {

    private final LoanProductService loanProductService;

    public LoanProductController(LoanProductService loanProductService) {
        this.loanProductService = loanProductService;
    }

    @GetMapping
    @Operation(summary = "List Active Loan Products", description = "List all active loan products, optionally filtered by loan category/type")
    public ResponseEntity<LoanProductListResponse> listProducts(
            @RequestParam(required = false) String loanType) {
        return ResponseEntity.ok(loanProductService.getProducts(loanType));
    }

    @GetMapping("/{productCode}")
    @Operation(summary = "Get Loan Product Details", description = "Retrieve full active loan product details by product code")
    public ResponseEntity<PublicLoanProductDetailResponse> getProductDetails(@PathVariable String productCode) {
        return ResponseEntity.ok(loanProductService.getActiveProductDetails(productCode));
    }

    @GetMapping("/{productCode}/interest-rates")
    @Operation(summary = "Get Current Interest Rates", description = "Retrieve current interest rate range and calculation method for an active loan product")
    public ResponseEntity<InterestRateInfoResponse> getInterestRates(@PathVariable String productCode) {
        return ResponseEntity.ok(loanProductService.getProductInterestRates(productCode));
    }

    @GetMapping("/{productCode}/fees")
    @Operation(summary = "Get Fees and Charges", description = "Retrieve processing fees, prepayment, foreclosure, late payment, and bounce charges")
    public ResponseEntity<LoanProductFeeResponse> getFeesAndCharges(@PathVariable String productCode) {
        return ResponseEntity.ok(loanProductService.getProductFees(productCode));
    }

    @GetMapping("/{productCode}/eligibility")
    @Operation(summary = "Get Eligibility Information", description = "Retrieve income, FOIR, LTV, employment, tenure, and document eligibility requirements")
    public ResponseEntity<ProductEligibilityResponse> getEligibility(@PathVariable String productCode) {
        return ResponseEntity.ok(loanProductService.getProductEligibility(productCode));
    }

    @GetMapping("/{productCode}/offers")
    @Operation(summary = "Get Available Offers", description = "Retrieve currently active promotional offers applicable to the loan product")
    public ResponseEntity<List<DynamicOfferResponse>> getAvailableOffers(@PathVariable String productCode) {
        return ResponseEntity.ok(loanProductService.getAvailableOffersForProduct(productCode));
    }
}
