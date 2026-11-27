package com.fintech.investment.controller;

import com.fintech.investment.dto.InvestmentProductDtos.*;
import com.fintech.investment.service.InvestmentProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/investments/admin/products")
@Tag(name = "Investment Product Admin", description = "Admin & Manager product configuration, rate slabs, versions, audit logs, and stats")
public class InvestmentProductAdminController {

    private final InvestmentProductService productService;

    public InvestmentProductAdminController(InvestmentProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "List all investment products including drafts and inactive")
    public List<ProductResponse> listAll() {
        return productService.listAllProductsAdmin();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new investment product")
    public ProductResponse create(@Valid @RequestBody CreateOrUpdateProductRequest request) {
        return productService.createProduct(request);
    }

    @PutMapping("/{productCode}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update product configuration, rate slabs, and create new version")
    public ProductResponse update(@PathVariable String productCode,
                                  @Valid @RequestBody CreateOrUpdateProductRequest request) {
        return productService.updateProduct(productCode, request);
    }

    @PatchMapping("/{productCode}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate, deactivate, or archive an investment product")
    public ProductResponse updateStatus(@PathVariable String productCode,
                                        @Valid @RequestBody UpdateProductStatusRequest request) {
        return productService.updateProductStatus(productCode, request);
    }

    @GetMapping("/{productCode}/versions")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get version history of a product")
    public List<ProductVersionResponse> getVersions(@PathVariable String productCode) {
        return productService.getProductVersions(productCode);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Get administrative product audit logs")
    public List<ProductAuditLogResponse> getAuditLogs(@RequestParam(required = false) String productCode) {
        return productService.getAuditLogs(productCode);
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATIONS')")
    @Operation(summary = "Get investment statistics and product performance")
    public List<ProductPerformanceStats> getStatistics() {
        return productService.getProductStatistics();
    }
}
