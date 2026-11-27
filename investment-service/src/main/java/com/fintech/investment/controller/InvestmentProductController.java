package com.fintech.investment.controller;

import com.fintech.investment.dto.InvestmentProductDtos.ProductResponse;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import com.fintech.investment.service.InvestmentProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/investments/products")
@Tag(name = "Investment Products (Public)", description = "Browse active FD, RD, SIP, and SSY products and rate slabs")
public class InvestmentProductController {

    private final InvestmentProductService productService;

    public InvestmentProductController(InvestmentProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @Operation(summary = "List active investment products")
    public List<ProductResponse> listProducts(@RequestParam(required = false) ProductType type) {
        return productService.listPublicProducts(type);
    }

    @GetMapping("/{productCode}")
    @Operation(summary = "Get active investment product details by code")
    public ProductResponse getProduct(@PathVariable String productCode) {
        return productService.getPublicProduct(productCode);
    }
}
