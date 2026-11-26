package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.CreateLoanProductRequest;
import com.fintech.loan.dto.request.LoanProductFeeRequest;
import com.fintech.loan.dto.request.ProductManagementRequests.*;
import com.fintech.loan.dto.request.UpdateLoanProductRequest;
import com.fintech.loan.dto.response.DynamicOfferResponses.DynamicOfferResponse;
import com.fintech.loan.dto.response.LoanProductListResponse;
import com.fintech.loan.dto.response.LoanProductResponse;
import com.fintech.loan.dto.response.LoanProductResponses.*;
import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.entity.LoanProductFee;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProductStatus;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanApplicationRepository;
import com.fintech.loan.repository.LoanProductFeeRepository;
import com.fintech.loan.repository.LoanProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class LoanProductService {

    private static final Logger log = LoggerFactory.getLogger(LoanProductService.class);
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "productCode", "productName", "loanCategory", "status",
            "minimumLoanAmount", "maximumLoanAmount", "minimumInterestRate", "createdAt", "updatedAt"
    );

    private final LoanProductRepository productRepository;
    private final LoanProductFeeRepository feeRepository;
    private final LoanApplicationRepository applicationRepository;
    private final DynamicLoanOfferService offerService;
    private final LoanOutboxService outboxService;
    private final LoanNotificationService notificationService;
    private final String productCreatedTopic;
    private final String productUpdatedTopic;

    public LoanProductService(
            LoanProductRepository productRepository,
            LoanProductFeeRepository feeRepository,
            LoanApplicationRepository applicationRepository,
            DynamicLoanOfferService offerService,
            LoanOutboxService outboxService,
            LoanNotificationService notificationService,
            @Value("${app.kafka.topics.product-created:" + LoanConstants.TOPIC_PRODUCT_CREATED + "}") String productCreatedTopic,
            @Value("${app.kafka.topics.product-updated:" + LoanConstants.TOPIC_PRODUCT_UPDATED + "}") String productUpdatedTopic) {
        this.productRepository = productRepository;
        this.feeRepository = feeRepository;
        this.applicationRepository = applicationRepository;
        this.offerService = offerService;
        this.outboxService = outboxService;
        this.notificationService = notificationService;
        this.productCreatedTopic = productCreatedTopic;
        this.productUpdatedTopic = productUpdatedTopic;
    }

    // =====================================================================
    // Admin Operations
    // =====================================================================

    @Transactional
    public AdminLoanProductResponse createProduct(CreateLoanProductRequest request, String actor) {
        String normalizedCode = request.productCode().trim().toUpperCase();
        if (productRepository.existsByProductCodeIgnoreCase(normalizedCode)) {
            throw ApiException.conflict("PRODUCT_ALREADY_EXISTS",
                    "A loan product with productCode '" + normalizedCode + "' already exists.");
        }

        validateFinancialBounds(
                request.minimumLoanAmount(), request.maximumLoanAmount(),
                request.minimumInterestRate(), request.maximumInterestRate(),
                request.minimumTenureMonths(), request.maximumTenureMonths(),
                request.feesAndCharges()
        );

        String operator = normalizeActor(actor);
        LoanProduct product = new LoanProduct();
        product.setId(UUID.randomUUID());
        product.setProductCode(normalizedCode);
        product.setProductName(request.productName().trim());
        product.setShortDescription(request.shortDescription());
        product.setDetailedDescription(request.detailedDescription());
        product.setLoanCategory(request.loanCategory());
        product.setEligibleLoanPurposes(normalizeStringList(request.eligibleLoanPurposes()));
        product.setEmploymentTypes(normalizeUpperList(request.employmentTypes()));
        product.setStatus(request.status() != null ? request.status() : ProductStatus.DRAFT);
        product.setDeleted(false);
        product.setCurrency(request.currency() != null && !request.currency().isBlank()
                ? request.currency().trim().toUpperCase()
                : LoanConstants.DEFAULT_CURRENCY);
        product.setMinimumLoanAmount(request.minimumLoanAmount());
        product.setMaximumLoanAmount(request.maximumLoanAmount());
        product.setMinimumInterestRate(request.minimumInterestRate());
        product.setMaximumInterestRate(request.maximumInterestRate());
        product.setInterestCalculationMethod(request.interestCalculationMethod());
        product.setMinimumTenureMonths(request.minimumTenureMonths());
        product.setMaximumTenureMonths(request.maximumTenureMonths());
        product.setMaximumLTVPercentage(request.maximumLTVPercentage());
        product.setMinimumMonthlyIncome(request.minimumMonthlyIncome() != null
                ? request.minimumMonthlyIncome() : BigDecimal.ZERO);
        product.setMaxFoirPercentage(request.maxFoirPercentage() != null
                ? request.maxFoirPercentage() : LoanConstants.DEFAULT_MAX_FOIR_PERCENTAGE);
        product.setSecured(Boolean.TRUE.equals(request.secured()));
        product.setBalanceTransferAllowed(Boolean.TRUE.equals(request.balanceTransferAllowed()));
        product.setTopUpAllowed(Boolean.TRUE.equals(request.topUpAllowed()));
        product.setStepUpEMIAllowed(Boolean.TRUE.equals(request.stepUpEMIAllowed()));
        product.setStepUpEMIDurationMonths(request.stepUpEMIDurationMonths() != null
                ? request.stepUpEMIDurationMonths() : 0);
        product.setRequiredDocuments(normalizeUpperList(request.requiredDocuments()));
        product.setEligibilityRules(request.eligibilityRules());
        product.setApplicableOffers(normalizeUpperList(request.applicableOffers()));
        product.setCreatedBy(operator);
        product.setUpdatedBy(operator);
        product.syncLegacyFields();

        LoanProduct savedProduct = productRepository.save(product);

        LoanProductFee fee = new LoanProductFee();
        fee.setId(UUID.randomUUID());
        fee.setProductId(savedProduct.getId());
        applyFeeRequest(fee, request.feesAndCharges());
        LoanProductFee savedFee = feeRepository.save(fee);

        publishProductEvent(productCreatedTopic, LoanConstants.EVT_PRODUCT_CREATED, savedProduct, operator);
        notificationService.notifyAdmin(
                "LOAN_PRODUCT_CREATED",
                "Loan Product Created: " + savedProduct.getProductCode(),
                "Admin " + operator + " created loan product " + savedProduct.getProductName()
                        + " (" + savedProduct.getProductCode() + ") with status " + savedProduct.getStatus() + ".",
                savedProduct.getProductCode()
        );

        log.info("Loan product created: code={}, id={}, actor={}", savedProduct.getProductCode(), savedProduct.getId(), operator);
        return toAdminResponse(savedProduct, savedFee);
    }

    @Transactional
    public AdminLoanProductResponse updateProduct(String idOrCode, UpdateLoanProductRequest request, String actor) {
        LoanProduct product = resolveProductEntity(idOrCode, false);
        LoanProductFee fee = getOrCreateFee(product.getId());
        String operator = normalizeActor(actor);

        if (request.productName() != null && !request.productName().isBlank()) {
            product.setProductName(request.productName().trim());
        }
        if (request.shortDescription() != null) product.setShortDescription(request.shortDescription());
        if (request.detailedDescription() != null) product.setDetailedDescription(request.detailedDescription());
        if (request.loanCategory() != null) product.setLoanCategory(request.loanCategory());
        if (request.eligibleLoanPurposes() != null) product.setEligibleLoanPurposes(normalizeStringList(request.eligibleLoanPurposes()));
        if (request.employmentTypes() != null) product.setEmploymentTypes(normalizeUpperList(request.employmentTypes()));
        if (request.status() != null) product.setStatus(request.status());
        if (request.currency() != null && !request.currency().isBlank()) {
            product.setCurrency(request.currency().trim().toUpperCase());
        }

        BigDecimal minAmt = request.minimumLoanAmount() != null ? request.minimumLoanAmount() : product.getMinimumLoanAmount();
        BigDecimal maxAmt = request.maximumLoanAmount() != null ? request.maximumLoanAmount() : product.getMaximumLoanAmount();
        BigDecimal minRate = request.minimumInterestRate() != null ? request.minimumInterestRate() : product.getMinimumInterestRate();
        BigDecimal maxRate = request.maximumInterestRate() != null ? request.maximumInterestRate() : product.getMaximumInterestRate();
        Integer minTenure = request.minimumTenureMonths() != null ? request.minimumTenureMonths() : product.getMinimumTenureMonths();
        Integer maxTenure = request.maximumTenureMonths() != null ? request.maximumTenureMonths() : product.getMaximumTenureMonths();

        validateFinancialBounds(minAmt, maxAmt, minRate, maxRate, minTenure, maxTenure, request.feesAndCharges());

        product.setMinimumLoanAmount(minAmt);
        product.setMaximumLoanAmount(maxAmt);
        product.setMinimumInterestRate(minRate);
        product.setMaximumInterestRate(maxRate);
        if (request.interestCalculationMethod() != null) product.setInterestCalculationMethod(request.interestCalculationMethod());
        product.setMinimumTenureMonths(minTenure);
        product.setMaximumTenureMonths(maxTenure);
        if (request.maximumLTVPercentage() != null) product.setMaximumLTVPercentage(request.maximumLTVPercentage());
        if (request.minimumMonthlyIncome() != null) product.setMinimumMonthlyIncome(request.minimumMonthlyIncome());
        if (request.maxFoirPercentage() != null) product.setMaxFoirPercentage(request.maxFoirPercentage());
        if (request.secured() != null) product.setSecured(request.secured());
        if (request.balanceTransferAllowed() != null) product.setBalanceTransferAllowed(request.balanceTransferAllowed());
        if (request.topUpAllowed() != null) product.setTopUpAllowed(request.topUpAllowed());
        if (request.stepUpEMIAllowed() != null) product.setStepUpEMIAllowed(request.stepUpEMIAllowed());
        if (request.stepUpEMIDurationMonths() != null) product.setStepUpEMIDurationMonths(request.stepUpEMIDurationMonths());
        if (request.requiredDocuments() != null) product.setRequiredDocuments(normalizeUpperList(request.requiredDocuments()));
        if (request.eligibilityRules() != null) product.setEligibilityRules(request.eligibilityRules());
        if (request.applicableOffers() != null) product.setApplicableOffers(normalizeUpperList(request.applicableOffers()));

        product.setUpdatedBy(operator);
        product.syncLegacyFields();
        LoanProduct savedProduct = productRepository.save(product);

        if (request.feesAndCharges() != null) {
            applyFeeRequest(fee, request.feesAndCharges());
            fee = feeRepository.save(fee);
        }

        publishProductEvent(productUpdatedTopic, LoanConstants.EVT_PRODUCT_UPDATED, savedProduct, operator);
        notificationService.notifyAdmin(
                "LOAN_PRODUCT_UPDATED",
                "Loan Product Updated: " + savedProduct.getProductCode(),
                "Admin " + operator + " updated configuration for " + savedProduct.getProductCode() + ".",
                savedProduct.getProductCode()
        );

        return toAdminResponse(savedProduct, fee);
    }

    @Transactional
    public AdminLoanProductResponse updateProductStatus(String idOrCode, ProductStatus status, String actor) {
        LoanProduct product = resolveProductEntity(idOrCode, false);
        String operator = normalizeActor(actor);

        product.setStatus(status);
        product.setUpdatedBy(operator);
        product.syncLegacyFields();
        LoanProduct saved = productRepository.save(product);

        publishProductEvent(productUpdatedTopic, LoanConstants.EVT_PRODUCT_UPDATED, saved, operator);
        notificationService.notifyAdmin(
                "LOAN_PRODUCT_STATUS_CHANGED",
                "Loan Product Status Changed: " + saved.getProductCode(),
                "Loan product " + saved.getProductCode() + " is now " + saved.getStatus() + " (by " + operator + ").",
                saved.getProductCode()
        );

        return toAdminResponse(saved, getOrCreateFee(saved.getId()));
    }

    @Transactional
    public void deleteProduct(String idOrCode, String actor) {
        LoanProduct product = resolveProductEntity(idOrCode, false);
        String operator = normalizeActor(actor);

        boolean hasApplications = applicationRepository.existsByProductCodeIgnoreCase(product.getProductCode());
        if (hasApplications) {
            log.info("Loan product {} has existing applications; performing soft delete & deactivation to preserve history.",
                    product.getProductCode());
        }

        product.setDeleted(true);
        product.setStatus(ProductStatus.INACTIVE);
        product.setUpdatedBy(operator);
        product.syncLegacyFields();
        LoanProduct saved = productRepository.save(product);

        publishProductEvent(productUpdatedTopic, LoanConstants.EVT_PRODUCT_UPDATED, saved, operator);
        notificationService.notifyAdmin(
                "LOAN_PRODUCT_DELETED",
                "Loan Product Deactivated/Soft-Deleted: " + saved.getProductCode(),
                "Loan product " + saved.getProductCode() + " was soft-deleted by " + operator
                        + (hasApplications ? " (historical applications preserved)." : "."),
                saved.getProductCode()
        );
    }

    @Transactional
    public AdminLoanProductResponse updateTermsAndCharges(
            String idOrCode, UpdateFinancialTermsAndChargesRequest request, String actor) {
        LoanProduct product = resolveProductEntity(idOrCode, false);
        LoanProductFee fee = getOrCreateFee(product.getId());
        String operator = normalizeActor(actor);

        BigDecimal minAmt = request.minimumLoanAmount() != null ? request.minimumLoanAmount() : product.getMinimumLoanAmount();
        BigDecimal maxAmt = request.maximumLoanAmount() != null ? request.maximumLoanAmount() : product.getMaximumLoanAmount();
        BigDecimal minRate = request.minimumInterestRate() != null ? request.minimumInterestRate() : product.getMinimumInterestRate();
        BigDecimal maxRate = request.maximumInterestRate() != null ? request.maximumInterestRate() : product.getMaximumInterestRate();
        Integer minTenure = request.minimumTenureMonths() != null ? request.minimumTenureMonths() : product.getMinimumTenureMonths();
        Integer maxTenure = request.maximumTenureMonths() != null ? request.maximumTenureMonths() : product.getMaximumTenureMonths();

        validateFinancialBounds(minAmt, maxAmt, minRate, maxRate, minTenure, maxTenure, request.feesAndCharges());

        product.setMinimumLoanAmount(minAmt);
        product.setMaximumLoanAmount(maxAmt);
        product.setMinimumInterestRate(minRate);
        product.setMaximumInterestRate(maxRate);
        if (request.interestCalculationMethod() != null) product.setInterestCalculationMethod(request.interestCalculationMethod());
        product.setMinimumTenureMonths(minTenure);
        product.setMaximumTenureMonths(maxTenure);
        if (request.maximumLTVPercentage() != null) product.setMaximumLTVPercentage(request.maximumLTVPercentage());
        if (request.minimumMonthlyIncome() != null) product.setMinimumMonthlyIncome(request.minimumMonthlyIncome());
        if (request.maxFoirPercentage() != null) product.setMaxFoirPercentage(request.maxFoirPercentage());
        product.setUpdatedBy(operator);

        LoanProduct saved = productRepository.save(product);
        if (request.feesAndCharges() != null) {
            applyFeeRequest(fee, request.feesAndCharges());
            fee = feeRepository.save(fee);
        }

        publishProductEvent(productUpdatedTopic, LoanConstants.EVT_PRODUCT_UPDATED, saved, operator);
        return toAdminResponse(saved, fee);
    }

    @Transactional
    public AdminLoanProductResponse updateRequiredDocuments(String idOrCode, List<String> requiredDocuments, String actor) {
        LoanProduct product = resolveProductEntity(idOrCode, false);
        String operator = normalizeActor(actor);
        product.setRequiredDocuments(normalizeUpperList(requiredDocuments));
        product.setUpdatedBy(operator);
        LoanProduct saved = productRepository.save(product);
        publishProductEvent(productUpdatedTopic, LoanConstants.EVT_PRODUCT_UPDATED, saved, operator);
        return toAdminResponse(saved, getOrCreateFee(saved.getId()));
    }

    @Transactional
    public AdminLoanProductResponse updateEligibility(String idOrCode, UpdateEligibilityRequest request, String actor) {
        LoanProduct product = resolveProductEntity(idOrCode, false);
        String operator = normalizeActor(actor);
        if (request.minimumMonthlyIncome() != null) product.setMinimumMonthlyIncome(request.minimumMonthlyIncome());
        if (request.maxFoirPercentage() != null) product.setMaxFoirPercentage(request.maxFoirPercentage());
        if (request.maximumLTVPercentage() != null) product.setMaximumLTVPercentage(request.maximumLTVPercentage());
        if (request.employmentTypes() != null) product.setEmploymentTypes(normalizeUpperList(request.employmentTypes()));
        if (request.eligibleLoanPurposes() != null) product.setEligibleLoanPurposes(normalizeStringList(request.eligibleLoanPurposes()));
        if (request.eligibilityRules() != null) product.setEligibilityRules(request.eligibilityRules());
        product.setUpdatedBy(operator);
        LoanProduct saved = productRepository.save(product);
        publishProductEvent(productUpdatedTopic, LoanConstants.EVT_PRODUCT_UPDATED, saved, operator);
        return toAdminResponse(saved, getOrCreateFee(saved.getId()));
    }

    @Transactional
    public AdminLoanProductResponse updateApplicableOffers(String idOrCode, List<String> applicableOffers, String actor) {
        LoanProduct product = resolveProductEntity(idOrCode, false);
        String operator = normalizeActor(actor);
        product.setApplicableOffers(normalizeUpperList(applicableOffers));
        product.setUpdatedBy(operator);
        LoanProduct saved = productRepository.save(product);
        publishProductEvent(productUpdatedTopic, LoanConstants.EVT_PRODUCT_UPDATED, saved, operator);
        return toAdminResponse(saved, getOrCreateFee(saved.getId()));
    }

    @Transactional(readOnly = true)
    public AdminLoanProductResponse getProductById(UUID id) {
        LoanProduct product = productRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND", "Loan product not found with ID: " + id));
        return toAdminResponse(product, feeRepository.findByProductId(product.getId()).orElse(null));
    }

    @Transactional(readOnly = true)
    public AdminLoanProductResponse getProductByCode(String productCode) {
        LoanProduct product = productRepository.findByProductCodeIgnoreCase(productCode.trim())
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND",
                        "Loan product not found with code: " + productCode));
        return toAdminResponse(product, feeRepository.findByProductId(product.getId()).orElse(null));
    }

    @Transactional(readOnly = true)
    public PagedResponse<AdminLoanProductResponse> listAdminProducts(
            LoanCategory loanCategory, ProductStatus status, Boolean includeDeleted,
            String search, int page, int size, String sortBy, String sortDirection) {
        int safePage = Math.max(0, page);
        int safeSize = (size <= 0 || size > LoanConstants.MAX_PAGE_SIZE) ? LoanConstants.DEFAULT_PAGE_SIZE : size;
        String safeSort = (sortBy != null && ALLOWED_SORT_FIELDS.contains(sortBy)) ? sortBy : "productName";
        Sort.Direction direction = "DESC".equalsIgnoreCase(sortDirection) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, safeSort));

        String searchParam = (search != null && !search.isBlank()) ? search.trim() : "";
        Page<LoanProduct> resultPage = productRepository.findAdminProducts(
                loanCategory, status, Boolean.TRUE.equals(includeDeleted), searchParam, pageable);

        List<UUID> ids = resultPage.getContent().stream().map(LoanProduct::getId).toList();
        Map<UUID, LoanProductFee> feesByProductId = ids.isEmpty() ? Map.of() :
                feeRepository.findAllByProductIdIn(ids).stream()
                        .collect(Collectors.toMap(LoanProductFee::getProductId, Function.identity()));

        Page<AdminLoanProductResponse> mapped = resultPage.map(p -> toAdminResponse(p, feesByProductId.get(p.getId())));
        return PagedResponse.of(mapped);
    }

    // =====================================================================
    // Public / Customer Operations (Active, non-deleted products only)
    // =====================================================================

    @Transactional(readOnly = true)
    public LoanProductListResponse getProducts(String loanType) {
        List<LoanProduct> products;
        if (loanType != null && !loanType.isBlank()) {
            LoanCategory category;
            try {
                category = LoanCategory.valueOf(loanType.trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("INVALID_LOAN_CATEGORY",
                        "Invalid loan category: " + loanType);
            }
            products = productRepository.findAllByLoanCategoryAndStatusAndDeletedFalseOrderByProductNameAsc(
                    category, ProductStatus.ACTIVE);
        } else {
            products = productRepository.findAllByStatusAndDeletedFalseOrderByProductNameAsc(ProductStatus.ACTIVE);
        }

        List<UUID> ids = products.stream().map(LoanProduct::getId).toList();
        Map<UUID, LoanProductFee> feesByProductId = ids.isEmpty() ? Map.of() :
                feeRepository.findAllByProductIdIn(ids).stream()
                        .collect(Collectors.toMap(LoanProductFee::getProductId, Function.identity()));

        List<LoanProductResponse> responseList = products.stream()
                .map(p -> toPublicListItem(p, feesByProductId.get(p.getId())))
                .toList();

        return new LoanProductListResponse(responseList);
    }

    @Transactional(readOnly = true)
    public PublicLoanProductDetailResponse getActiveProductDetails(String productCode) {
        LoanProduct product = findActiveProductOrThrow(productCode);
        LoanProductFee fee = feeRepository.findByProductId(product.getId()).orElse(null);
        return toPublicDetailResponse(product, fee);
    }

    @Transactional(readOnly = true)
    public InterestRateInfoResponse getProductInterestRates(String productCode) {
        LoanProduct product = findActiveProductOrThrow(productCode);
        return new InterestRateInfoResponse(
                product.getProductCode(),
                product.getProductName(),
                product.getMinimumInterestRate(),
                product.getMaximumInterestRate(),
                product.getInterestCalculationMethod(),
                product.getCurrency()
        );
    }

    @Transactional(readOnly = true)
    public LoanProductFeeResponse getProductFees(String productCode) {
        LoanProduct product = findActiveProductOrThrow(productCode);
        LoanProductFee fee = feeRepository.findByProductId(product.getId())
                .orElseThrow(() -> ApiException.notFound("PRODUCT_FEES_NOT_FOUND",
                        "Fee configuration not found for product: " + productCode));
        return toFeeResponse(fee);
    }

    @Transactional(readOnly = true)
    public ProductEligibilityResponse getProductEligibility(String productCode) {
        LoanProduct product = findActiveProductOrThrow(productCode);
        return new ProductEligibilityResponse(
                product.getProductCode(),
                product.getProductName(),
                product.getMinimumLoanAmount(),
                product.getMaximumLoanAmount(),
                product.getMinimumTenureMonths(),
                product.getMaximumTenureMonths(),
                product.getMinimumMonthlyIncome(),
                product.getMaxFoirPercentage(),
                product.getMaximumLTVPercentage(),
                product.getEmploymentTypes(),
                product.getEligibleLoanPurposes(),
                product.getRequiredDocuments(),
                product.getEligibilityRules()
        );
    }

    @Transactional(readOnly = true)
    public List<DynamicOfferResponse> getAvailableOffersForProduct(String productCode) {
        LoanProduct product = findActiveProductOrThrow(productCode);
        return offerService.getActiveOffersForProduct(product.getProductCode());
    }

    @Transactional(readOnly = true)
    public LoanProduct findActiveProductOrThrow(String productCode) {
        if (productCode == null || productCode.isBlank()) {
            throw ApiException.badRequest("INVALID_PRODUCT_CODE", "Product code is required.");
        }
        return productRepository.findByProductCodeIgnoreCaseAndStatusAndDeletedFalse(
                        productCode.trim(), ProductStatus.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND",
                        "Active loan product not found: " + productCode));
    }

    // =====================================================================
    // Helpers & Mappers
    // =====================================================================

    private LoanProduct resolveProductEntity(String idOrCode, boolean includeDeleted) {
        try {
            UUID uuid = UUID.fromString(idOrCode.trim());
            return (includeDeleted
                    ? productRepository.findById(uuid)
                    : productRepository.findByIdAndDeletedFalse(uuid))
                    .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND",
                            "Loan product not found: " + idOrCode));
        } catch (IllegalArgumentException ignored) {
            return (includeDeleted
                    ? productRepository.findByProductCodeIgnoreCase(idOrCode.trim())
                    : productRepository.findByProductCodeIgnoreCaseAndDeletedFalse(idOrCode.trim()))
                    .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND",
                            "Loan product not found: " + idOrCode));
        }
    }

    private LoanProductFee getOrCreateFee(UUID productId) {
        return feeRepository.findByProductId(productId).orElseGet(() -> {
            LoanProductFee f = new LoanProductFee();
            f.setId(UUID.randomUUID());
            f.setProductId(productId);
            return f;
        });
    }

    private void validateFinancialBounds(
            BigDecimal minAmount, BigDecimal maxAmount,
            BigDecimal minRate, BigDecimal maxRate,
            Integer minTenure, Integer maxTenure,
            LoanProductFeeRequest feeRequest) {
        if (minAmount != null && maxAmount != null && minAmount.compareTo(maxAmount) > 0) {
            throw ApiException.badRequest("INVALID_AMOUNT_RANGE",
                    "Minimum loan amount cannot exceed maximum loan amount.");
        }
        if (minRate != null && maxRate != null && minRate.compareTo(maxRate) > 0) {
            throw ApiException.badRequest("INVALID_INTEREST_RATE_RANGE",
                    "Minimum interest rate cannot exceed maximum interest rate.");
        }
        if (minTenure != null && maxTenure != null && minTenure > maxTenure) {
            throw ApiException.badRequest("INVALID_TENURE_RANGE",
                    "Minimum tenure months cannot exceed maximum tenure months.");
        }
        if (feeRequest != null && feeRequest.minimumProcessingFee() != null
                && feeRequest.maximumProcessingFee() != null
                && feeRequest.maximumProcessingFee().compareTo(BigDecimal.ZERO) > 0
                && feeRequest.minimumProcessingFee().compareTo(feeRequest.maximumProcessingFee()) > 0) {
            throw ApiException.badRequest("INVALID_FEE_RANGE",
                    "Minimum processing fee cannot exceed maximum processing fee.");
        }
    }

    private void applyFeeRequest(LoanProductFee fee, LoanProductFeeRequest req) {
        fee.setProcessingFeeType(req.processingFeeType());
        fee.setProcessingFeeValue(req.processingFeeValue());
        fee.setMinimumProcessingFee(req.minimumProcessingFee() != null ? req.minimumProcessingFee() : BigDecimal.ZERO);
        fee.setMaximumProcessingFee(req.maximumProcessingFee());
        fee.setPrepaymentChargePercentage(req.prepaymentChargePercentage() != null ? req.prepaymentChargePercentage() : BigDecimal.ZERO);
        fee.setPrepaymentCharges(req.prepaymentCharges());
        fee.setForeclosureChargePercentage(req.foreclosureChargePercentage() != null ? req.foreclosureChargePercentage() : BigDecimal.ZERO);
        fee.setForeclosureCharges(req.foreclosureCharges());
        fee.setLatePaymentPenalty(req.latePaymentPenalty() != null ? req.latePaymentPenalty() : new BigDecimal("2.00"));
        fee.setLatePaymentPenaltyDescription(req.latePaymentPenaltyDescription());
        fee.setChequeBounceCharges(req.chequeBounceCharges() != null ? req.chequeBounceCharges() : new BigDecimal("400.00"));
        fee.setAdditionalCharges(req.additionalCharges());
    }

    private void publishProductEvent(String topic, String eventType, LoanProduct product, String actor) {
        LoanEvents.LoanProductLifecyclePayload payload = new LoanEvents.LoanProductLifecyclePayload(
                product.getId().toString(),
                product.getProductCode(),
                product.getProductName(),
                product.getLoanCategory().name(),
                product.getStatus().name(),
                actor,
                Instant.now()
        );
        outboxService.enqueueEvent(topic, product.getProductCode(), "LOAN_PRODUCT", eventType, payload);
    }

    private List<String> normalizeStringList(List<String> input) {
        if (input == null) return List.of();
        return input.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();
    }

    private List<String> normalizeUpperList(List<String> input) {
        if (input == null) return List.of();
        return input.stream()
                .filter(Objects::nonNull)
                .map(s -> s.trim().toUpperCase())
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();
    }

    private String normalizeActor(String actor) {
        return (actor != null && !actor.isBlank()) ? actor : "ADMIN";
    }

    private LoanProductFeeResponse toFeeResponse(LoanProductFee f) {
        if (f == null) return null;
        return new LoanProductFeeResponse(
                f.getId(),
                f.getProcessingFeeType(),
                f.getProcessingFeeValue(),
                f.getMinimumProcessingFee(),
                f.getMaximumProcessingFee(),
                f.getPrepaymentChargePercentage(),
                f.getPrepaymentCharges(),
                f.getForeclosureChargePercentage(),
                f.getForeclosureCharges(),
                f.getLatePaymentPenalty(),
                f.getLatePaymentPenaltyDescription(),
                f.getChequeBounceCharges(),
                f.getAdditionalCharges()
        );
    }

    private AdminLoanProductResponse toAdminResponse(LoanProduct p, LoanProductFee f) {
        return new AdminLoanProductResponse(
                p.getId(),
                p.getProductCode(),
                p.getProductName(),
                p.getShortDescription(),
                p.getDetailedDescription(),
                p.getLoanCategory(),
                p.getEligibleLoanPurposes(),
                p.getEmploymentTypes(),
                p.getStatus(),
                p.isDeleted(),
                p.getCurrency(),
                p.getMinimumLoanAmount(),
                p.getMaximumLoanAmount(),
                p.getMinimumInterestRate(),
                p.getMaximumInterestRate(),
                p.getInterestCalculationMethod(),
                p.getMinimumTenureMonths(),
                p.getMaximumTenureMonths(),
                p.getMaximumLTVPercentage(),
                p.getMinimumMonthlyIncome(),
                p.getMaxFoirPercentage(),
                Boolean.TRUE.equals(p.getSecured()),
                p.isBalanceTransferAllowed(),
                p.isTopUpAllowed(),
                p.isStepUpEMIAllowed(),
                p.getStepUpEMIDurationMonths(),
                p.getRequiredDocuments(),
                p.getEligibilityRules(),
                p.getApplicableOffers(),
                toFeeResponse(f),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                p.getCreatedBy(),
                p.getUpdatedBy(),
                p.getVersion()
        );
    }

    private PublicLoanProductDetailResponse toPublicDetailResponse(LoanProduct p, LoanProductFee f) {
        return new PublicLoanProductDetailResponse(
                p.getId(),
                p.getProductCode(),
                p.getProductName(),
                p.getShortDescription(),
                p.getDetailedDescription(),
                p.getLoanCategory(),
                p.getEligibleLoanPurposes(),
                p.getEmploymentTypes(),
                p.getCurrency(),
                p.getMinimumLoanAmount(),
                p.getMaximumLoanAmount(),
                p.getMinimumInterestRate(),
                p.getMaximumInterestRate(),
                p.getInterestCalculationMethod(),
                p.getMinimumTenureMonths(),
                p.getMaximumTenureMonths(),
                p.getMaximumLTVPercentage(),
                p.getMinimumMonthlyIncome(),
                p.getMaxFoirPercentage(),
                Boolean.TRUE.equals(p.getSecured()),
                p.isBalanceTransferAllowed(),
                p.isTopUpAllowed(),
                p.isStepUpEMIAllowed(),
                p.getStepUpEMIDurationMonths(),
                p.getRequiredDocuments(),
                p.getEligibilityRules(),
                p.getApplicableOffers(),
                toFeeResponse(f)
        );
    }

    private LoanProductResponse toPublicListItem(LoanProduct p, LoanProductFee f) {
        LoanProductResponse r = new LoanProductResponse(
                p.getProductCode(),
                p.getProductName(),
                p.getLoanCategory().name(),
                p.getCurrency(),
                p.getMinimumLoanAmount(),
                p.getMaximumLoanAmount(),
                p.getMinimumTenureMonths(),
                p.getMaximumTenureMonths(),
                p.getMinimumInterestRate(),
                p.getInterestCalculationMethod().name(),
                Boolean.TRUE.equals(p.getSecured())
        );
        return r;
    }
}
