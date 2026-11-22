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

        if (request.minimumAge() != null && request.maximumAge() != null && request.maximumAge() < request.minimumAge()) {
            throw AccountException.badRequest("Maximum age (" + request.maximumAge() + ") cannot be less than minimum age (" + request.minimumAge() + ")");
        }

        String slug = request.slug();
        if (slug != null && !slug.isBlank()) {
            slug = slug.trim();
            if (productRepository.existsBySlug(slug)) {
                throw AccountException.conflict("SLUG_ALREADY_EXISTS",
                        "An account product with slug '" + slug + "' already exists.");
            }
        } else {
            slug = generateSlug(request.productName(), request.productCode());
            if (productRepository.existsBySlug(slug)) {
                slug = slug + "-" + request.productCode().toLowerCase().replace('_', '-');
            }
        }

        String category = request.category();
        if (category == null || category.isBlank()) {
            category = request.accountType() != null ? request.accountType().name() : "SAVINGS";
        }

        String status = request.status();
        if (status == null || status.isBlank()) {
            status = "ACTIVE";
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

        product.setSlug(slug);
        product.setCategory(category);
        product.setTagline(request.tagline());
        product.setStatus(status);
        product.setInterestNote(request.interestNote());

        product.setAmb(request.amb());
        product.setFees(request.fees());
        product.setCharges(request.charges());
        product.setDocuments(request.documents());
        product.setEligibility(request.eligibility());
        product.setFaqs(request.faqs());
        product.setFeatures(request.features());
        product.setHowToApply(request.howToApply());
        product.setRateSlabs(request.rateSlabs());

        AccountProduct saved = productRepository.save(product);
        auditLogger.logAudit("CREATE_PRODUCT", "AccountProduct", saved.getProductCode(), createdBy,
                "Product created with code: " + saved.getProductCode());

        return toResponse(saved);
    }

    @Transactional
    public AccountProductResponse updateProduct(String productCode, UpdateProductRequest request, String updatedBy) {
        AccountProduct product = productRepository.findByProductCode(productCode)
                .orElseThrow(() -> AccountException.notFound("Account product not found with code: " + productCode));

        Integer effectiveMinAge = request.minimumAge() != null ? request.minimumAge() : product.getMinimumAge();
        Integer effectiveMaxAge = request.maximumAge() != null ? request.maximumAge() : product.getMaximumAge();
        if (effectiveMinAge != null && effectiveMaxAge != null && effectiveMaxAge < effectiveMinAge) {
            throw AccountException.badRequest("Maximum age (" + effectiveMaxAge + ") cannot be less than minimum age (" + effectiveMinAge + ")");
        }

        if (request.productName() != null) {
            if (request.productName().isBlank()) {
                throw AccountException.badRequest("Product name cannot be blank");
            }
            product.setProductName(request.productName());
        }
        if (request.description() != null) {
            product.setDescription(request.description());
        }
        if (request.minimumBalance() != null) {
            product.setMinimumBalance(request.minimumBalance());
        }
        if (request.minimumInitialFunding() != null) {
            product.setMinimumInitialFunding(request.minimumInitialFunding());
        }
        if (request.interestRate() != null) {
            product.setInterestRate(request.interestRate());
        }
        if (request.dailyTransferLimit() != null) {
            product.setDailyTransferLimit(request.dailyTransferLimit());
        }
        if (request.monthlyTransferLimit() != null) {
            product.setMonthlyTransferLimit(request.monthlyTransferLimit());
        }
        if (request.minimumAge() != null) {
            product.setMinimumAge(request.minimumAge());
        }
        if (request.maximumAge() != null) {
            product.setMaximumAge(request.maximumAge());
        }
        if (request.requiresKyc() != null) {
            product.setRequiresKyc(request.requiresKyc());
        }
        if (request.active() != null) {
            product.setActive(request.active());
        }

        // Additional product identification & text fields
        if (request.slug() != null) {
            String slug = request.slug().trim();
            if (slug.isBlank()) {
                throw AccountException.badRequest("Slug cannot be blank");
            }
            if (!slug.equals(product.getSlug()) && productRepository.existsBySlug(slug)) {
                throw AccountException.conflict("SLUG_ALREADY_EXISTS",
                        "An account product with slug '" + slug + "' already exists.");
            }
            product.setSlug(slug);
        }
        if (request.category() != null) {
            if (request.category().isBlank()) {
                throw AccountException.badRequest("Category cannot be blank");
            }
            product.setCategory(request.category());
        }
        if (request.tagline() != null) {
            product.setTagline(request.tagline());
        }
        if (request.status() != null) {
            if (request.status().isBlank()) {
                throw AccountException.badRequest("Status cannot be blank");
            }
            product.setStatus(request.status());
        }
        if (request.interestNote() != null) {
            product.setInterestNote(request.interestNote());
        }

        // Additional JSONB fields
        if (request.amb() != null) {
            product.setAmb(request.amb());
        }
        if (request.fees() != null) {
            product.setFees(request.fees());
        }
        if (request.charges() != null) {
            product.setCharges(request.charges());
        }
        if (request.documents() != null) {
            product.setDocuments(request.documents());
        }
        if (request.eligibility() != null) {
            product.setEligibility(request.eligibility());
        }
        if (request.faqs() != null) {
            product.setFaqs(request.faqs());
        }
        if (request.features() != null) {
            product.setFeatures(request.features());
        }
        if (request.howToApply() != null) {
            product.setHowToApply(request.howToApply());
        }
        if (request.rateSlabs() != null) {
            product.setRateSlabs(request.rateSlabs());
        }

        product.setUpdatedBy(updatedBy != null ? updatedBy : "ADMIN");

        AccountProduct saved = productRepository.save(product);
        auditLogger.logAudit("UPDATE_PRODUCT", "AccountProduct", saved.getProductCode(), updatedBy,
                "Product updated: " + saved.getProductCode());

        return toResponse(saved);
    }

    private String generateSlug(String productName, String productCode) {
        String base = (productName != null && !productName.isBlank()) ? productName : productCode;
        if (base == null || base.isBlank()) {
            return "product-" + java.util.UUID.randomUUID().toString().substring(0, 8);
        }
        String slug = base.toLowerCase().trim()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        return slug.isEmpty() ? "product-" + java.util.UUID.randomUUID().toString().substring(0, 8) : slug;
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
