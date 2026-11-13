package com.fintech.account.service;

import com.fintech.account.dto.request.CreateProductRequest;
import com.fintech.account.dto.request.UpdateProductRequest;
import com.fintech.account.dto.response.AccountProductResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.entity.AccountProduct;
import com.fintech.account.enums.AccountType;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountProductRepository;
import com.fintech.account.util.AuditLogger;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AccountProductService {

    private final AccountProductRepository productRepository;
    private final AuditLogger auditLogger;

    public AccountProductService(AccountProductRepository productRepository, AuditLogger auditLogger) {
        this.productRepository = productRepository;
        this.auditLogger = auditLogger;
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<AccountProductResponse> listProducts(AccountType type, Boolean active, String cursor, int limit) {
        int pageSize = (limit <= 0 || limit > 100) ? 20 : limit;
        Slice<AccountProduct> slice = productRepository.findProductsWithCursor(type, active, cursor, PageRequest.of(0, pageSize));

        List<AccountProductResponse> responses = slice.getContent().stream()
                .map(this::toResponse)
                .toList();

        String nextCursor = null;
        if (slice.hasNext() && !responses.isEmpty()) {
            nextCursor = responses.get(responses.size() - 1).productCode();
        }

        return CursorPagedResponse.of(responses, nextCursor, slice.hasNext(), pageSize);
    }

    @Transactional(readOnly = true)
    public AccountProductResponse getProductDetails(String productCode) {
        AccountProduct product = productRepository.findByProductCode(productCode)
                .orElseThrow(() -> AccountException.notFound("Account product not found with code: " + productCode));

        return toResponse(product);
    }

    @Transactional
    public AccountProductResponse createProduct(CreateProductRequest request, String createdBy) {
        if (productRepository.existsByProductCode(request.productCode())) {
            throw AccountException.conflict("PRODUCT_ALREADY_EXISTS",
                    "An account product with code '" + request.productCode() + "' already exists.");
        }

        AccountProduct product = new AccountProduct();
        product.setProductCode(request.productCode());
        product.setProductName(request.productName());
        product.setDescription(request.description());
        product.setAccountType(request.accountType());
        product.setCurrency(request.currency().toUpperCase());
        product.setMinimumBalance(request.minimumBalance());
        product.setMinimumInitialFunding(request.minimumInitialFunding());
        product.setInterestRate(request.interestRate());
        product.setDailyTransferLimit(request.dailyTransferLimit());
        product.setMonthlyTransferLimit(request.monthlyTransferLimit());
        product.setMinimumAge(request.minimumAge());
        product.setMaximumAge(request.maximumAge());
        product.setRequiresKyc(request.requiresKyc() == null || request.requiresKyc());
        product.setActive(request.active() == null || request.active());
        product.setCreatedBy(createdBy != null ? createdBy : "ADMIN");
        product.setUpdatedBy(createdBy != null ? createdBy : "ADMIN");

        AccountProduct saved = productRepository.save(product);
        auditLogger.logAudit("CREATE_PRODUCT", "AccountProduct", saved.getProductCode(), createdBy,
                "Product created with code: " + saved.getProductCode());

        return toResponse(saved);
    }

    @Transactional
    public AccountProductResponse updateProduct(String productCode, UpdateProductRequest request, String updatedBy) {
        AccountProduct product = productRepository.findByProductCode(productCode)
                .orElseThrow(() -> AccountException.notFound("Account product not found with code: " + productCode));

        product.setProductName(request.productName());
        product.setDescription(request.description());
        product.setMinimumBalance(request.minimumBalance());
        product.setMinimumInitialFunding(request.minimumInitialFunding());
        product.setInterestRate(request.interestRate());
        product.setDailyTransferLimit(request.dailyTransferLimit());
        product.setMonthlyTransferLimit(request.monthlyTransferLimit());
        product.setMinimumAge(request.minimumAge());
        product.setMaximumAge(request.maximumAge());
        if (request.requiresKyc() != null) {
            product.setRequiresKyc(request.requiresKyc());
        }
        product.setUpdatedBy(updatedBy != null ? updatedBy : "ADMIN");

        AccountProduct saved = productRepository.save(product);
        auditLogger.logAudit("UPDATE_PRODUCT", "AccountProduct", saved.getProductCode(), updatedBy,
                "Product updated: " + saved.getProductCode());

        return toResponse(saved);
    }

    @Transactional
    public AccountProductResponse updateProductStatus(String productCode, boolean active, String updatedBy) {
        AccountProduct product = productRepository.findByProductCode(productCode)
                .orElseThrow(() -> AccountException.notFound("Account product not found with code: " + productCode));

        product.setActive(active);
        product.setUpdatedBy(updatedBy != null ? updatedBy : "ADMIN");

        AccountProduct saved = productRepository.save(product);
        auditLogger.logAudit("UPDATE_PRODUCT_STATUS", "AccountProduct", saved.getProductCode(), updatedBy,
                "Product status updated to active=" + active);

        return toResponse(saved);
    }

    public AccountProductResponse toResponse(AccountProduct product) {

        return new AccountProductResponse(
                product.getProductCode(),
                product.getProductName(),
                product.getDescription(),
                product.getAccountType(),
                product.getCurrency(),

                product.getMinimumBalance(),
                product.getMinimumInitialFunding(),
                product.getInterestRate(),
                product.getDailyTransferLimit(),
                product.getMonthlyTransferLimit(),
                product.getMinimumAge(),
                product.getMaximumAge(),
                product.isRequiresKyc(),
                product.isActive(),

                product.getSlug(),
                product.getCategory(),
                product.getTagline(),
                product.getStatus(),
                product.getInterestNote(),

                product.getAmb(),
                product.getFees(),
                product.getCharges(),

                product.getDocuments(),
                product.getEligibility(),
                product.getFaqs(),
                product.getFeatures(),
                product.getHowToApply(),

                product.getRateSlabs()
        );
    }
}
