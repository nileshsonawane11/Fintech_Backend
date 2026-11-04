package com.fintech.account.controller;

import com.fintech.account.dto.response.AccountProductResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.enums.AccountType;
import com.fintech.account.service.AccountProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/account-products")
@Tag(name = "Customer - Account Products", description = "Endpoints for discovering available account products")
@SecurityRequirement(name = "BearerAuth")
public class AccountProductController {

    private final AccountProductService productService;

    public AccountProductController(AccountProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @Operation(summary = "List Account Products", description = "List all active bank account products with cursor pagination")
//    @PreAuthorize("hasAuthority('ACCOUNT_PRODUCT_READ') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<CursorPagedResponse<AccountProductResponse>> listProducts(
            @Parameter(description = "Account product type filter") @RequestParam(required = false) AccountType type,
            @Parameter(description = "Filter by active status (default true)") @RequestParam(defaultValue = "true") Boolean active,
            @Parameter(description = "Pagination limit") @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Cursor for pagination") @RequestParam(required = false) String cursor) {

        CursorPagedResponse<AccountProductResponse> response = productService.listProducts(type, active, cursor, limit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{productCode}")
    @Operation(summary = "Get Account Product Details", description = "Retrieve full details of a specific account product")
//    @PreAuthorize("hasAuthority('ACCOUNT_PRODUCT_READ') or hasRole('CUSTOMER') or hasRole('OPERATIONS') or hasRole('ADMIN')")
    public ResponseEntity<AccountProductResponse> getProductDetails(
            @Parameter(description = "Product code identifier") @PathVariable String productCode) {

        AccountProductResponse response = productService.getProductDetails(productCode);
        return ResponseEntity.ok(response);
    }
}
