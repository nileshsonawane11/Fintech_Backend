package com.fintech.loan.controller;

import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.dto.request.CreateLoanProductRequest;
import com.fintech.loan.dto.request.ProductManagementRequests.*;
import com.fintech.loan.dto.request.UpdateLoanProductRequest;
import com.fintech.loan.dto.response.LoanProductResponses.AdminLoanProductResponse;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProductStatus;
import com.fintech.loan.service.LoanProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/loans/admin/products")
@Tag(name = "Admin - Loan Products", description = "Admin endpoints for dynamic loan product catalog lifecycle management")
@SecurityRequirement(name = "BearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class LoanProductAdminController {

    private final LoanProductService productService;

    public LoanProductAdminController(LoanProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    @Operation(summary = "Create Loan Product")
    public ResponseEntity<AdminLoanProductResponse> createProduct(
            @Valid @RequestBody CreateLoanProductRequest request) {
        String actor = SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(request, actor));
    }

    @PutMapping("/{idOrCode}")
    @Operation(summary = "Update Loan Product")
    public ResponseEntity<AdminLoanProductResponse> updateProduct(
            @PathVariable String idOrCode,
            @Valid @RequestBody UpdateLoanProductRequest request) {
        String actor = SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.ok(productService.updateProduct(idOrCode, request, actor));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve Loan Product by ID")
    public ResponseEntity<AdminLoanProductResponse> getProductById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping("/code/{productCode}")
    @Operation(summary = "Retrieve Loan Product by Product Code")
    public ResponseEntity<AdminLoanProductResponse> getProductByCode(@PathVariable String productCode) {
        return ResponseEntity.ok(productService.getProductByCode(productCode));
    }

    @GetMapping
    @Operation(summary = "List All Loan Products (Paginated, Sorted, Filtered)")
    public ResponseEntity<PagedResponse<AdminLoanProductResponse>> listProducts(
            @RequestParam(required = false) LoanCategory loanCategory,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(defaultValue = "false") Boolean includeDeleted,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "productName") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {
        return ResponseEntity.ok(productService.listAdminProducts(
                loanCategory, status, includeDeleted, search, page, size, sortBy, sortDirection));
    }

    @PatchMapping("/{idOrCode}/status")
    @Operation(summary = "Activate or Deactivate Loan Product")
    public ResponseEntity<AdminLoanProductResponse> updateStatus(
            @PathVariable String idOrCode,
            @Valid @RequestBody ProductStatusUpdateRequest request) {
        String actor = SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.ok(productService.updateProductStatus(idOrCode, request.status(), actor));
    }

    @DeleteMapping("/{idOrCode}")
    @Operation(summary = "Soft-Delete Loan Product Safely")
    public ResponseEntity<Void> deleteProduct(@PathVariable String idOrCode) {
        String actor = SecurityUtils.getAuthenticatedSubject();
        productService.deleteProduct(idOrCode, actor);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{idOrCode}/terms-and-charges")
    @Operation(summary = "Update Financial Terms and Charges")
    public ResponseEntity<AdminLoanProductResponse> updateTermsAndCharges(
            @PathVariable String idOrCode,
            @Valid @RequestBody UpdateFinancialTermsAndChargesRequest request) {
        String actor = SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.ok(productService.updateTermsAndCharges(idOrCode, request, actor));
    }

    @PutMapping("/{idOrCode}/required-documents")
    @Operation(summary = "Manage Required Documents")
    public ResponseEntity<AdminLoanProductResponse> updateRequiredDocuments(
            @PathVariable String idOrCode,
            @Valid @RequestBody UpdateRequiredDocumentsRequest request) {
        String actor = SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.ok(productService.updateRequiredDocuments(idOrCode, request.requiredDocuments(), actor));
    }

    @PutMapping("/{idOrCode}/eligibility")
    @Operation(summary = "Manage Eligibility Configuration")
    public ResponseEntity<AdminLoanProductResponse> updateEligibility(
            @PathVariable String idOrCode,
            @Valid @RequestBody UpdateEligibilityRequest request) {
        String actor = SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.ok(productService.updateEligibility(idOrCode, request, actor));
    }

    @PutMapping("/{idOrCode}/offers")
    @Operation(summary = "Manage Product Applicable Offers")
    public ResponseEntity<AdminLoanProductResponse> updateApplicableOffers(
            @PathVariable String idOrCode,
            @Valid @RequestBody UpdateProductOffersRequest request) {
        String actor = SecurityUtils.getAuthenticatedSubject();
        return ResponseEntity.ok(productService.updateApplicableOffers(idOrCode, request.applicableOffers(), actor));
    }
}
