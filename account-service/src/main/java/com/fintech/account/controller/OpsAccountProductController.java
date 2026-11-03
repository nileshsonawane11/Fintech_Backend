package com.fintech.account.controller;

import com.fintech.account.dto.request.CreateProductRequest;
import com.fintech.account.dto.request.ProductStatusRequest;
import com.fintech.account.dto.request.UpdateProductRequest;
import com.fintech.account.dto.response.AccountProductResponse;
import com.fintech.account.service.AccountProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ops/api/v1/account-products")
@Tag(name = "Operations - Account Products", description = "Operations and administration endpoints for account products")
@SecurityRequirement(name = "BearerAuth")
public class OpsAccountProductController {

    private final AccountProductService productService;

    public OpsAccountProductController(AccountProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    @Operation(summary = "Create Account Product", description = "Create a new bank account product catalog entry")
    @PreAuthorize("hasAuthority('ACCOUNT_PRODUCT_CREATE') or hasRole('ADMIN')")
    public ResponseEntity<AccountProductResponse> createProduct(
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String createdBy = jwt != null ? jwt.getSubject() : "ADMIN";
        AccountProductResponse response = productService.createProduct(request, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{productCode}")
    @Operation(summary = "Update Account Product", description = "Update configuration of an existing account product")
    @PreAuthorize("hasAuthority('ACCOUNT_PRODUCT_UPDATE') or hasRole('ADMIN')")
    public ResponseEntity<AccountProductResponse> updateProduct(
            @Parameter(description = "Product code") @PathVariable String productCode,
            @Valid @RequestBody UpdateProductRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String updatedBy = jwt != null ? jwt.getSubject() : "ADMIN";
        AccountProductResponse response = productService.updateProduct(productCode, request, updatedBy);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{productCode}/status")
    @Operation(summary = "Activate / Deactivate Product", description = "Change active status of an account product")
    @PreAuthorize("hasAuthority('ACCOUNT_PRODUCT_STATUS_UPDATE') or hasRole('ADMIN')")
    public ResponseEntity<AccountProductResponse> updateProductStatus(
            @Parameter(description = "Product code") @PathVariable String productCode,
            @Valid @RequestBody ProductStatusRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        String updatedBy = jwt != null ? jwt.getSubject() : "ADMIN";
        AccountProductResponse response = productService.updateProductStatus(productCode, request.active(), updatedBy);
        return ResponseEntity.ok(response);
    }
}
