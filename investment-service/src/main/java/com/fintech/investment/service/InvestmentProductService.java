package com.fintech.investment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.investment.config.SecurityUtils;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.dto.InvestmentProductDtos.*;
import com.fintech.investment.entity.InvestmentEnums.InvestmentStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductStatus;
import com.fintech.investment.entity.InvestmentEnums.ProductType;
import com.fintech.investment.entity.InvestmentProduct;
import com.fintech.investment.entity.InvestmentProductAuditLog;
import com.fintech.investment.entity.InvestmentProductVersion;
import com.fintech.investment.entity.InvestmentRateSlab;
import com.fintech.investment.exception.ApiException;
import com.fintech.investment.repository.InvestmentProductAuditLogRepository;
import com.fintech.investment.repository.InvestmentProductRepository;
import com.fintech.investment.repository.InvestmentProductVersionRepository;
import com.fintech.investment.repository.InvestmentRateSlabRepository;
import com.fintech.investment.repository.InvestmentRepository;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class InvestmentProductService {

    private final InvestmentProductRepository productRepository;
    private final InvestmentProductVersionRepository versionRepository;
    private final InvestmentRateSlabRepository rateSlabRepository;
    private final InvestmentProductAuditLogRepository auditLogRepository;
    private final InvestmentRepository investmentRepository;
    private final ObjectMapper objectMapper;

    public InvestmentProductService(
            InvestmentProductRepository productRepository,
            InvestmentProductVersionRepository versionRepository,
            InvestmentRateSlabRepository rateSlabRepository,
            InvestmentProductAuditLogRepository auditLogRepository,
            InvestmentRepository investmentRepository,
            ObjectMapper objectMapper) {
        this.productRepository = productRepository;
        this.versionRepository = versionRepository;
        this.rateSlabRepository = rateSlabRepository;
        this.auditLogRepository = auditLogRepository;
        this.investmentRepository = investmentRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> listPublicProducts(ProductType type) {
        List<InvestmentProduct> products = (type == null)
                ? productRepository.findByStatusAndDeletedFalseOrderByProductTypeAscProductNameAsc(ProductStatus.ACTIVE)
                : productRepository.findByProductTypeAndStatusAndDeletedFalseOrderByProductNameAsc(type, ProductStatus.ACTIVE);
        return products.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getPublicProduct(String productCode) {
        InvestmentProduct product = productRepository.findByProductCodeAndDeletedFalse(productCode)
                .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND", "Active investment product not found: " + productCode));
        return toResponse(product);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> listAllProductsAdmin() {
        return productRepository.findByDeletedFalseOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProductResponse createProduct(CreateOrUpdateProductRequest req) {
        if (productRepository.existsByProductCodeAndDeletedFalse(req.productCode())) {
            throw ApiException.conflict("PRODUCT_CODE_EXISTS", "Product code already exists: " + req.productCode());
        }
        validateProductBounds(req);

        InvestmentProduct product = new InvestmentProduct();
        applyRequest(product, req);
        product.setStatus(ProductStatus.DRAFT);
        product.setActiveVersion(1);
        product.setCreatedBy(SecurityUtils.getAuthenticatedSubject());
        product.setUpdatedBy(SecurityUtils.getAuthenticatedSubject());
        product = productRepository.save(product);

        saveRateSlabs(product.getId(), 1, req.rateSlabs());
        createVersionSnapshot(product, req.changeSummary() != null ? req.changeSummary() : "Initial product creation");
        recordAudit(product, "CREATE_PRODUCT", null, toJsonSafe(product), req.changeSummary());
        return toResponse(product);
    }

    @Transactional
    public ProductResponse updateProduct(String productCode, CreateOrUpdateProductRequest req) {
        InvestmentProduct product = findByCodeOrThrow(productCode);
        validateProductBounds(req);

        String previousSnapshot = toJsonSafe(product);
        int nextVersion = product.getActiveVersion() + 1;
        applyRequest(product, req);
        product.setActiveVersion(nextVersion);
        product.setUpdatedBy(SecurityUtils.getAuthenticatedSubject());
        product = productRepository.save(product);

        // Close previous active version effective_to
        List<InvestmentProductVersion> versions = versionRepository.findByProductIdOrderByVersionNumberDesc(product.getId());
        if (!versions.isEmpty()) {
            InvestmentProductVersion latest = versions.get(0);
            if (latest.getEffectiveTo() == null) {
                latest.setEffectiveTo(Instant.now());
                versionRepository.save(latest);
            }
        }

        if (req.rateSlabs() != null && !req.rateSlabs().isEmpty()) {
            List<InvestmentRateSlab> existingSlabs = rateSlabRepository
                    .findByProductIdAndActiveTrueOrderByMinTenureDaysAscMinAmountAsc(product.getId());
            existingSlabs.forEach(s -> s.setActive(false));
            rateSlabRepository.saveAll(existingSlabs);
            saveRateSlabs(product.getId(), nextVersion, req.rateSlabs());
        }

        createVersionSnapshot(product, req.changeSummary() != null ? req.changeSummary() : "Updated product configuration v" + nextVersion);
        recordAudit(product, "UPDATE_PRODUCT", previousSnapshot, toJsonSafe(product), req.changeSummary());
        return toResponse(product);
    }

    @Transactional
    public ProductResponse updateProductStatus(String productCode, UpdateProductStatusRequest req) {
        InvestmentProduct product = findByCodeOrThrow(productCode);
        String prev = product.getStatus().name();
        product.setStatus(req.status());
        product.setUpdatedBy(SecurityUtils.getAuthenticatedSubject());
        if (req.status() == ProductStatus.ARCHIVED) {
            product.setDeleted(true);
        }
        product = productRepository.save(product);
        recordAudit(product, "STATUS_CHANGE_" + req.status().name(), prev, req.status().name(), req.remarks());
        return toResponse(product);
    }

    @Transactional(readOnly = true)
    public List<ProductVersionResponse> getProductVersions(String productCode) {
        InvestmentProduct product = findByCodeOrThrow(productCode);
        return versionRepository.findByProductIdOrderByVersionNumberDesc(product.getId()).stream()
                .map(v -> new ProductVersionResponse(
                        v.getId(), v.getVersionNumber(), v.getEffectiveFrom(), v.getEffectiveTo(),
                        v.getBaseRate(), v.getMaxRate(), v.getChangeSummary(), v.getCreatedBy(), v.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductAuditLogResponse> getAuditLogs(String productCode) {
        List<InvestmentProductAuditLog> logs;
        if (productCode != null && !productCode.isBlank()) {
            InvestmentProduct product = findByCodeOrThrow(productCode);
            logs = auditLogRepository.findByProductIdOrderByCreatedAtDesc(product.getId());
        } else {
            logs = auditLogRepository.findTop100ByOrderByCreatedAtDesc();
        }
        return logs.stream()
                .map(l -> new ProductAuditLogResponse(
                        l.getId(), l.getProductId(), l.getProductCode(), l.getAction(),
                        l.getChangedBy(), l.getChangedByRole(), l.getRemarks(), l.getCorrelationId(), l.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductPerformanceStats> getProductStatistics() {
        return productRepository.findByDeletedFalseOrderByCreatedAtDesc().stream()
                .map(p -> new ProductPerformanceStats(
                        p.getProductCode(),
                        p.getProductName(),
                        p.getProductType(),
                        p.getStatus(),
                        investmentRepository.countByProductCodeAndStatus(p.getProductCode(), InvestmentStatus.ACTIVE),
                        investmentRepository.sumActiveInvestedByProductCode(p.getProductCode())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public BigDecimal resolveApplicableRate(InvestmentProduct product, int tenureDays, BigDecimal amount, LocalDate asOf) {
        List<InvestmentRateSlab> slabs = rateSlabRepository.findMatchingSlabs(
                product.getId(), asOf != null ? asOf : LocalDate.now(), tenureDays, amount);
        if (!slabs.isEmpty()) {
            return slabs.get(0).getInterestRate();
        }
        return product.getBaseRate();
    }

    public InvestmentProduct findActiveByCodeOrThrow(String productCode) {
        return productRepository.findByProductCodeAndDeletedFalse(productCode)
                .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_ACTIVE",
                        "Active investment product not found: " + productCode));
    }

    private InvestmentProduct findByCodeOrThrow(String productCode) {
        return productRepository.findByProductCodeAndDeletedFalse(productCode)
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND", "Product not found: " + productCode));
    }

    private void validateProductBounds(CreateOrUpdateProductRequest req) {
        if (req.maxAmount().compareTo(req.minAmount()) < 0) {
            throw ApiException.badRequest("INVALID_AMOUNT_RANGE", "maxAmount must be >= minAmount.");
        }
        if (req.maxTenureMonths() < req.minTenureMonths()) {
            throw ApiException.badRequest("INVALID_TENURE_RANGE", "maxTenureMonths must be >= minTenureMonths.");
        }
        if (req.maxRate().compareTo(req.baseRate()) < 0) {
            throw ApiException.badRequest("INVALID_RATE_RANGE", "maxRate must be >= baseRate.");
        }
        if (req.productType() == ProductType.SIP && req.returnsGuaranteed()) {
            throw ApiException.badRequest("SIP_CANNOT_GUARANTEE_RETURNS",
                    "SIP products are market-linked and cannot guarantee returns.");
        }
    }

    private void applyRequest(InvestmentProduct p, CreateOrUpdateProductRequest req) {
        p.setProductCode(req.productCode().trim().toUpperCase());
        p.setProductName(req.productName().trim());
        p.setProductType(req.productType());
        p.setShortDescription(req.shortDescription());
        p.setDetailedDescription(req.detailedDescription());
        p.setCurrency(req.currency().toUpperCase());
        p.setMinAmount(req.minAmount());
        p.setMaxAmount(req.maxAmount());
        p.setDenominationStep(req.denominationStep());
        p.setMinTenureMonths(req.minTenureMonths());
        p.setMaxTenureMonths(req.maxTenureMonths());
        p.setBaseRate(req.baseRate());
        p.setMaxRate(req.maxRate());
        p.setCompoundingFrequency(req.compoundingFrequency().toUpperCase());
        p.setPayoutOptions(req.payoutOptions().toUpperCase());
        p.setPrematureWithdrawalAllowed(req.prematureWithdrawalAllowed());
        p.setPrematurePenaltyPct(req.prematurePenaltyPct());
        p.setLockInMonths(req.lockInMonths());
        p.setLoanAgainstFdAllowed(req.loanAgainstFdAllowed());
        p.setMaxLtvPct(req.maxLtvPct());
        p.setAutoRenewalSupported(req.autoRenewalSupported());
        p.setReturnsGuaranteed(req.returnsGuaranteed());
        p.setMarketLinked(req.marketLinked());
        p.setGovernmentScheme(req.governmentScheme());
        p.setFundCategory(req.fundCategory());
        p.setBenchmarkIndex(req.benchmarkIndex());
        p.setRiskLevel(req.riskLevel());
        p.setEligibilityCriteria(req.eligibilityCriteria());
        p.setRequiredDocuments(req.requiredDocuments());
        p.setBenefits(req.benefits());
        p.setRegulatoryDisclosures(req.regulatoryDisclosures());
        p.setFeeRules(req.feeRules());
    }

    private void saveRateSlabs(UUID productId, int versionNumber, List<RateSlabRequest> slabs) {
        if (slabs == null || slabs.isEmpty()) return;
        List<InvestmentRateSlab> entities = slabs.stream().map(s -> {
            InvestmentRateSlab slab = new InvestmentRateSlab();
            slab.setProductId(productId);
            slab.setVersionNumber(versionNumber);
            slab.setMinTenureDays(s.minTenureDays());
            slab.setMaxTenureDays(s.maxTenureDays());
            slab.setMinAmount(s.minAmount());
            slab.setMaxAmount(s.maxAmount());
            slab.setInterestRate(s.interestRate());
            slab.setSeniorCitizenBonusRate(s.seniorCitizenBonusRate() != null ? s.seniorCitizenBonusRate() : BigDecimal.ZERO);
            slab.setPayoutFrequency(s.payoutFrequency().toUpperCase());
            slab.setEffectiveFrom(s.effectiveFrom());
            slab.setEffectiveTo(s.effectiveTo());
            slab.setActive(true);
            return slab;
        }).toList();
        rateSlabRepository.saveAll(entities);
    }

    private void createVersionSnapshot(InvestmentProduct product, String summary) {
        InvestmentProductVersion version = new InvestmentProductVersion();
        version.setProductId(product.getId());
        version.setProductCode(product.getProductCode());
        version.setVersionNumber(product.getActiveVersion());
        version.setEffectiveFrom(Instant.now());
        version.setBaseRate(product.getBaseRate());
        version.setMaxRate(product.getMaxRate());
        version.setConfigSnapshot(toJsonSafe(product));
        version.setChangeSummary(summary);
        version.setCreatedBy(SecurityUtils.getAuthenticatedSubject());
        versionRepository.save(version);
    }

    private void recordAudit(InvestmentProduct product, String action, String prev, String next, String remarks) {
        InvestmentProductAuditLog log = new InvestmentProductAuditLog();
        log.setProductId(product.getId());
        log.setProductCode(product.getProductCode());
        log.setAction(action);
        log.setPreviousState(prev);
        log.setNewState(next);
        log.setChangedBy(SecurityUtils.getAuthenticatedSubject());
        log.setChangedByRole(SecurityUtils.getPrimaryRole());
        log.setRemarks(remarks);
        log.setCorrelationId(MDC.get(InvestmentConstants.MDC_CORRELATION_ID));
        auditLogRepository.save(log);
    }

    private String toJsonSafe(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return String.valueOf(obj);
        }
    }

    public ProductResponse toResponse(InvestmentProduct p) {
        List<RateSlabResponse> slabs = rateSlabRepository
                .findByProductIdAndActiveTrueOrderByMinTenureDaysAscMinAmountAsc(p.getId())
                .stream()
                .map(s -> new RateSlabResponse(
                        s.getId(), s.getVersionNumber(), s.getMinTenureDays(), s.getMaxTenureDays(),
                        s.getMinAmount(), s.getMaxAmount(), s.getInterestRate(), s.getSeniorCitizenBonusRate(),
                        s.getPayoutFrequency(), s.getEffectiveFrom(), s.getEffectiveTo(), s.isActive()))
                .toList();

        return new ProductResponse(
                p.getId(), p.getProductCode(), p.getProductName(), p.getProductType(), p.getStatus(),
                p.getActiveVersion(), p.getShortDescription(), p.getDetailedDescription(), p.getCurrency(),
                p.getMinAmount(), p.getMaxAmount(), p.getDenominationStep(), p.getMinTenureMonths(),
                p.getMaxTenureMonths(), p.getBaseRate(), p.getMaxRate(), p.getCompoundingFrequency(),
                p.getPayoutOptions(), p.isPrematureWithdrawalAllowed(), p.getPrematurePenaltyPct(),
                p.getLockInMonths(), p.isLoanAgainstFdAllowed(), p.getMaxLtvPct(), p.isAutoRenewalSupported(),
                p.isReturnsGuaranteed(), p.isMarketLinked(), p.isGovernmentScheme(), p.getFundCategory(),
                p.getBenchmarkIndex(), p.getRiskLevel(), p.getEligibilityCriteria(), p.getRequiredDocuments(),
                p.getBenefits(), p.getRegulatoryDisclosures(), p.getFeeRules(), slabs, p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
