package com.fintech.card.service;

import com.fintech.card.dto.request.CreateCardProductRequest;
import com.fintech.card.dto.request.UpdateCardProductRequest;
import com.fintech.card.dto.response.AdminCardProductResponse;
import com.fintech.card.dto.response.PagedCardProductResponse;
import com.fintech.card.dto.response.PublicCardProductResponse;
import com.fintech.card.entity.CardProduct;
import com.fintech.card.entity.config.CreditCardConfig;
import com.fintech.card.entity.config.DebitCardConfig;
import com.fintech.card.enums.CardType;
import com.fintech.card.exception.CardProductConflictException;
import com.fintech.card.exception.CardProductNotFoundException;
import com.fintech.card.exception.CardProductValidationException;
import com.fintech.card.repository.CardApplicationRepository;
import com.fintech.card.repository.CardProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class CardProductService {

    private static final Logger log = LoggerFactory.getLogger(CardProductService.class);

    private final CardProductRepository productRepository;
    private final CardApplicationRepository applicationRepository;

    public CardProductService(CardProductRepository productRepository,
                              CardApplicationRepository applicationRepository) {
        this.productRepository = productRepository;
        this.applicationRepository = applicationRepository;
    }

    // =========================================================================
    // Admin Operations
    // =========================================================================

    @Transactional
    public AdminCardProductResponse createProduct(CreateCardProductRequest request, String createdBy) {
        String normalizedCode = request.productCode().trim().toUpperCase();

        if (productRepository.existsByProductCode(normalizedCode)) {
            throw new CardProductConflictException("PRODUCT_ALREADY_EXISTS",
                    "A card product with code '" + normalizedCode + "' already exists.");
        }

        validateAgeRange(request.eligibilityMinAge(), request.eligibilityMaxAge());
        validateCardTypeConfig(request.cardType(), request.creditCardConfig(), request.debitCardConfig());

        CardProduct product = new CardProduct();
        product.setProductCode(normalizedCode);
        product.setProductName(request.productName().trim());
        product.setCardType(request.cardType());
        product.setNetwork(request.network().trim().toUpperCase());
        product.setShortDescription(request.shortDescription());
        product.setDescription(request.description());
        product.setJoiningFee(request.joiningFee());
        product.setAnnualFee(request.annualFee());
        product.setForexMarkupPercentage(request.forexMarkupPercentage());

        product.setEligibilityMinAge(request.eligibilityMinAge());
        product.setEligibilityMaxAge(request.eligibilityMaxAge());
        product.setEligibilityMinMonthlyIncome(request.eligibilityMinMonthlyIncome() != null ?
                request.eligibilityMinMonthlyIncome() : BigDecimal.ZERO);
        product.setEligibilityMinCreditScore(request.eligibilityMinCreditScore() != null ?
                request.eligibilityMinCreditScore() : 0);
        product.setEligibilityEmploymentTypes(request.eligibilityEmploymentTypes());
        product.setEligibilityMinIncomeHistoryMonths(request.eligibilityMinIncomeHistoryMonths() != null ?
                request.eligibilityMinIncomeHistoryMonths() : 0);

        product.setActive(request.isActive() == null || request.isActive());
        product.setDeleted(false);

        if (request.cardType() == CardType.CREDIT) {
            product.setCreditCardConfig(request.creditCardConfig());
            product.setDebitCardConfig(null);
        } else {
            product.setDebitCardConfig(request.debitCardConfig());
            product.setCreditCardConfig(null);
        }

        product.setBenefits(request.benefits());
        product.setFeatures(request.features());
        product.setFeesAndCharges(request.feesAndCharges());
        product.setApplicationInstructions(request.applicationInstructions());

        String operator = (createdBy != null && !createdBy.isBlank()) ? createdBy : "ADMIN";
        product.setCreatedBy(operator);
        product.setUpdatedBy(operator);

        CardProduct saved = productRepository.save(product);
        log.info("Card product created: id={}, code={}, type={}, createdBy={}",
                saved.getId(), saved.getProductCode(), saved.getCardType(), operator);

        return toAdminResponse(saved);
    }

    @Transactional
    public AdminCardProductResponse updateProduct(UUID id, UpdateCardProductRequest request, String updatedBy) {
        CardProduct product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new CardProductNotFoundException("Active card product not found with ID: " + id));

        // Validate product code change if provided
        if (request.productCode() != null && !request.productCode().isBlank()) {
            String newCode = request.productCode().trim().toUpperCase();
            if (!newCode.equals(product.getProductCode())) {
                if (productRepository.existsByProductCodeAndIdNot(newCode, id)) {
                    throw new CardProductConflictException("PRODUCT_ALREADY_EXISTS",
                            "A card product with code '" + newCode + "' already exists.");
                }
                product.setProductCode(newCode);
            }
        }

        if (request.productName() != null && !request.productName().isBlank()) {
            product.setProductName(request.productName().trim());
        }

        if (request.network() != null && !request.network().isBlank()) {
            product.setNetwork(request.network().trim().toUpperCase());
        }

        if (request.shortDescription() != null) {
            product.setShortDescription(request.shortDescription());
        }

        if (request.description() != null) {
            product.setDescription(request.description());
        }

        if (request.joiningFee() != null) {
            product.setJoiningFee(request.joiningFee());
        }

        if (request.annualFee() != null) {
            product.setAnnualFee(request.annualFee());
        }

        if (request.forexMarkupPercentage() != null) {
            product.setForexMarkupPercentage(request.forexMarkupPercentage());
        }

        Integer effectiveMinAge = request.eligibilityMinAge() != null ? request.eligibilityMinAge() : product.getEligibilityMinAge();
        Integer effectiveMaxAge = request.eligibilityMaxAge() != null ? request.eligibilityMaxAge() : product.getEligibilityMaxAge();
        validateAgeRange(effectiveMinAge, effectiveMaxAge);

        if (request.eligibilityMinAge() != null) {
            product.setEligibilityMinAge(request.eligibilityMinAge());
        }
        if (request.eligibilityMaxAge() != null) {
            product.setEligibilityMaxAge(request.eligibilityMaxAge());
        }
        if (request.eligibilityMinMonthlyIncome() != null) {
            product.setEligibilityMinMonthlyIncome(request.eligibilityMinMonthlyIncome());
        }
        if (request.eligibilityMinCreditScore() != null) {
            product.setEligibilityMinCreditScore(request.eligibilityMinCreditScore());
        }
        if (request.eligibilityEmploymentTypes() != null) {
            product.setEligibilityEmploymentTypes(request.eligibilityEmploymentTypes());
        }
        if (request.eligibilityMinIncomeHistoryMonths() != null) {
            product.setEligibilityMinIncomeHistoryMonths(request.eligibilityMinIncomeHistoryMonths());
        }

        if (request.isActive() != null) {
            product.setActive(request.isActive());
        }

        CardType targetCardType = request.cardType() != null ? request.cardType() : product.getCardType();
        product.setCardType(targetCardType);

        if (targetCardType == CardType.CREDIT) {
            CreditCardConfig config = request.creditCardConfig() != null ? request.creditCardConfig() : product.getCreditCardConfig();
            if (config != null) {
                validateCreditConfig(config);
                product.setCreditCardConfig(config);
            }
            product.setDebitCardConfig(null);
        } else {
            DebitCardConfig config = request.debitCardConfig() != null ? request.debitCardConfig() : product.getDebitCardConfig();
            if (config != null) {
                validateDebitConfig(config);
                product.setDebitCardConfig(config);
            }
            product.setCreditCardConfig(null);
        }

        if (request.benefits() != null) {
            product.setBenefits(request.benefits());
        }
        if (request.features() != null) {
            product.setFeatures(request.features());
        }
        if (request.feesAndCharges() != null) {
            product.setFeesAndCharges(request.feesAndCharges());
        }
        if (request.applicationInstructions() != null) {
            product.setApplicationInstructions(request.applicationInstructions());
        }

        String operator = (updatedBy != null && !updatedBy.isBlank()) ? updatedBy : "ADMIN";
        product.setUpdatedBy(operator);

        CardProduct saved = productRepository.save(product);
        log.info("Card product updated: id={}, code={}, updatedBy={}", saved.getId(), saved.getProductCode(), operator);

        return toAdminResponse(saved);
    }

    @Transactional
    public AdminCardProductResponse updateProductStatus(UUID id, boolean active, String updatedBy) {
        CardProduct product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new CardProductNotFoundException("Card product not found with ID: " + id));

        product.setActive(active);
        String operator = (updatedBy != null && !updatedBy.isBlank()) ? updatedBy : "ADMIN";
        product.setUpdatedBy(operator);

        CardProduct saved = productRepository.save(product);
        log.info("Card product status updated: id={}, code={}, active={}, updatedBy={}",
                saved.getId(), saved.getProductCode(), active, operator);

        return toAdminResponse(saved);
    }

    @Transactional
    public void deleteProduct(UUID id, String deletedBy) {
        CardProduct product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new CardProductNotFoundException("Card product not found with ID: " + id));

        // Check whether active applications reference this product
        boolean hasExistingApplications = applicationRepository.existsByProductSlugIgnoreCase(product.getProductCode());
        if (hasExistingApplications) {
            log.info("Product code '{}' has existing card applications. Performing safe soft deletion.", product.getProductCode());
        }

        product.setDeleted(true);
        product.setActive(false);
        String operator = (deletedBy != null && !deletedBy.isBlank()) ? deletedBy : "ADMIN";
        product.setUpdatedBy(operator);

        productRepository.save(product);
        log.info("Card product soft deleted: id={}, code={}, deletedBy={}", id, product.getProductCode(), operator);
    }

    @Transactional(readOnly = true)
    public AdminCardProductResponse getAdminProductById(UUID id) {
        CardProduct product = productRepository.findById(id)
                .orElseThrow(() -> new CardProductNotFoundException("Card product not found with ID: " + id));
        return toAdminResponse(product);
    }

    @Transactional(readOnly = true)
    public AdminCardProductResponse getAdminProductByCode(String productCode) {
        CardProduct product = productRepository.findByProductCode(productCode.trim().toUpperCase())
                .orElseThrow(() -> new CardProductNotFoundException("Card product not found with code: " + productCode));
        return toAdminResponse(product);
    }

    @Transactional(readOnly = true)
    public PagedCardProductResponse<AdminCardProductResponse> listAdminProducts(
            String cardTypeStr,
            Boolean active,
            Boolean includeDeleted,
            String search,
            int page,
            int size,
            String sortBy,
            String sortDirection) {

        CardType cardType = null;
        if (cardTypeStr != null && !cardTypeStr.isBlank()) {
            if (!CardType.isValid(cardTypeStr)) {
                throw new CardProductValidationException("Invalid card type filter: " + cardTypeStr + ". Supported: CREDIT, DEBIT");
            }
            cardType = CardType.fromString(cardTypeStr);
        }

        int pageNumber = Math.max(0, page);
        int pageSize = (size <= 0 || size > 100) ? 20 : size;
        Sort.Direction direction = "DESC".equalsIgnoreCase(sortDirection) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String sortProperty = (sortBy != null && !sortBy.isBlank()) ? sortBy : "productName";

        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(direction, sortProperty));

        boolean allowDeleted = Boolean.TRUE.equals(includeDeleted);
        String searchParam = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<CardProduct> pagedResult = productRepository.findAdminProducts(cardType, active, allowDeleted, searchParam, pageable);

        Page<AdminCardProductResponse> responsePage = pagedResult.map(this::toAdminResponse);
        return PagedCardProductResponse.of(responsePage);
    }

    // =========================================================================
    // Public Operations
    // =========================================================================

    @Transactional(readOnly = true)
    public List<PublicCardProductResponse> listPublicActiveProducts(String cardTypeStr) {
        List<CardProduct> products;

        if (cardTypeStr != null && !cardTypeStr.isBlank()) {
            if (!CardType.isValid(cardTypeStr)) {
                throw new CardProductValidationException("Invalid card type: " + cardTypeStr + ". Must be CREDIT or DEBIT");
            }
            CardType cardType = CardType.fromString(cardTypeStr);
            products = productRepository.findByCardTypeAndIsActiveTrueAndIsDeletedFalseOrderByProductNameAsc(cardType);
        } else {
            products = productRepository.findAllByIsActiveTrueAndIsDeletedFalseOrderByProductNameAsc();
        }

        return products.stream()
                .map(this::toPublicResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicCardProductResponse getPublicProductByCode(String productCode) {
        if (productCode == null || productCode.isBlank()) {
            throw new CardProductValidationException("Product code is required");
        }

        CardProduct product = productRepository.findByProductCodeAndIsActiveTrueAndIsDeletedFalse(productCode.trim().toUpperCase())
                .orElseThrow(() -> new CardProductNotFoundException("Active card product not found with code: " + productCode));

        return toPublicResponse(product);
    }

    // =========================================================================
    // Validations & Mappers
    // =========================================================================

    private void validateAgeRange(Integer minAge, Integer maxAge) {
        if (minAge != null && maxAge != null && maxAge < minAge) {
            throw new CardProductValidationException("Eligibility maximum age (" + maxAge +
                    ") cannot be less than minimum age (" + minAge + ").");
        }
    }

    private void validateCardTypeConfig(CardType cardType, CreditCardConfig creditConfig, DebitCardConfig debitConfig) {
        if (cardType == CardType.CREDIT) {
            if (creditConfig == null) {
                throw new CardProductValidationException("Credit card configuration (credit_card_config) is required for CREDIT card products.");
            }
            validateCreditConfig(creditConfig);
        } else if (cardType == CardType.DEBIT) {
            if (debitConfig == null) {
                throw new CardProductValidationException("Debit card configuration (debit_card_config) is required for DEBIT card products.");
            }
            validateDebitConfig(debitConfig);
        }
    }

    private void validateCreditConfig(CreditCardConfig config) {
        if (config.getCreditLimitMin() != null && config.getCreditLimitMax() != null &&
                config.getCreditLimitMin().compareTo(config.getCreditLimitMax()) > 0) {
            throw new CardProductValidationException("Minimum credit limit (" + config.getCreditLimitMin() +
                    ") cannot exceed maximum credit limit (" + config.getCreditLimitMax() + ").");
        }
        if (config.getInterestFreePeriodDays() != null && config.getInterestFreePeriodDays() < 0) {
            throw new CardProductValidationException("Interest-free period days cannot be negative.");
        }
        if (config.getFinanceChargeApr() != null && config.getFinanceChargeApr().compareTo(BigDecimal.ZERO) < 0) {
            throw new CardProductValidationException("Finance charge APR cannot be negative.");
        }
    }

    private void validateDebitConfig(DebitCardConfig config) {
        if (config.getAtmDailyLimit() != null && config.getAtmDailyLimit().compareTo(BigDecimal.ZERO) < 0) {
            throw new CardProductValidationException("ATM daily limit cannot be negative.");
        }
        if (config.getPosDailyLimit() != null && config.getPosDailyLimit().compareTo(BigDecimal.ZERO) < 0) {
            throw new CardProductValidationException("POS daily limit cannot be negative.");
        }
        if (config.getOnlineDailyLimit() != null && config.getOnlineDailyLimit().compareTo(BigDecimal.ZERO) < 0) {
            throw new CardProductValidationException("Online daily limit cannot be negative.");
        }
    }

    public AdminCardProductResponse toAdminResponse(CardProduct p) {
        return new AdminCardProductResponse(
                p.getId(),
                p.getProductCode(),
                p.getProductName(),
                p.getCardType(),
                p.getNetwork(),
                p.getShortDescription(),
                p.getDescription(),
                p.getJoiningFee(),
                p.getAnnualFee(),
                p.getForexMarkupPercentage(),
                p.getEligibilityMinAge(),
                p.getEligibilityMaxAge(),
                p.getEligibilityMinMonthlyIncome(),
                p.getEligibilityMinCreditScore(),
                p.getEligibilityEmploymentTypes(),
                p.getEligibilityMinIncomeHistoryMonths(),
                p.isActive(),
                p.isDeleted(),
                p.getCreditCardConfig(),
                p.getDebitCardConfig(),
                p.getBenefits(),
                p.getFeatures(),
                p.getFeesAndCharges(),
                p.getApplicationInstructions(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                p.getCreatedBy(),
                p.getUpdatedBy(),
                p.getVersion()
        );
    }

    public PublicCardProductResponse toPublicResponse(CardProduct p) {
        return new PublicCardProductResponse(
                p.getId(),
                p.getProductCode(),
                p.getProductName(),
                p.getCardType(),
                p.getNetwork(),
                p.getShortDescription(),
                p.getDescription(),
                p.getJoiningFee(),
                p.getAnnualFee(),
                p.getForexMarkupPercentage(),
                p.getEligibilityMinAge(),
                p.getEligibilityMaxAge(),
                p.getEligibilityMinMonthlyIncome(),
                p.getEligibilityMinCreditScore(),
                p.getEligibilityEmploymentTypes(),
                p.getEligibilityMinIncomeHistoryMonths(),
                p.getCreditCardConfig(),
                p.getDebitCardConfig(),
                p.getBenefits(),
                p.getFeatures(),
                p.getFeesAndCharges(),
                p.getApplicationInstructions()
        );
    }
}
