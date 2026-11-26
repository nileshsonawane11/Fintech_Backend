package com.fintech.loan.service;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.CreateLoanOfferRequest;
import com.fintech.loan.dto.request.UpdateLoanOfferRequest;
import com.fintech.loan.dto.response.DynamicOfferResponses.*;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.OfferStatus;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanApplicationOfferSnapshotRepository;
import com.fintech.loan.repository.LoanOfferCampaignRepository;
import com.fintech.loan.repository.LoanOfferVersionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

/**
 * Dynamic Loan Offer Management with strict non-retroactive versioning:
 * - Creating or updating an offer records an immutable LoanOfferVersion.
 * - Offers only apply to applications submitted AFTER the offer becomes ACTIVE and within validFrom..validTo.
 * - Existing application snapshots are NEVER modified retroactively.
 */
@Service
public class DynamicLoanOfferService {

    private static final Logger log = LoggerFactory.getLogger(DynamicLoanOfferService.class);

    private final LoanOfferCampaignRepository offerRepository;
    private final LoanOfferVersionRepository versionRepository;
    private final LoanApplicationOfferSnapshotRepository snapshotRepository;
    private final LoanOutboxService outboxService;
    private final LoanNotificationService notificationService;
    private final String offerCreatedTopic;
    private final String offerUpdatedTopic;
    private final String offerActivatedTopic;
    private final String offerDeactivatedTopic;

    public DynamicLoanOfferService(
            LoanOfferCampaignRepository offerRepository,
            LoanOfferVersionRepository versionRepository,
            LoanApplicationOfferSnapshotRepository snapshotRepository,
            LoanOutboxService outboxService,
            LoanNotificationService notificationService,
            @Value("${app.kafka.topics.offer-created:" + LoanConstants.TOPIC_OFFER_CREATED + "}") String offerCreatedTopic,
            @Value("${app.kafka.topics.offer-updated:" + LoanConstants.TOPIC_OFFER_UPDATED + "}") String offerUpdatedTopic,
            @Value("${app.kafka.topics.offer-activated:" + LoanConstants.TOPIC_OFFER_ACTIVATED + "}") String offerActivatedTopic,
            @Value("${app.kafka.topics.offer-deactivated:" + LoanConstants.TOPIC_OFFER_DEACTIVATED + "}") String offerDeactivatedTopic) {
        this.offerRepository = offerRepository;
        this.versionRepository = versionRepository;
        this.snapshotRepository = snapshotRepository;
        this.outboxService = outboxService;
        this.notificationService = notificationService;
        this.offerCreatedTopic = offerCreatedTopic;
        this.offerUpdatedTopic = offerUpdatedTopic;
        this.offerActivatedTopic = offerActivatedTopic;
        this.offerDeactivatedTopic = offerDeactivatedTopic;
    }

    @Transactional
    public DynamicOfferResponse createOffer(CreateLoanOfferRequest request, String actor) {
        String normalizedCode = request.offerCode().trim().toUpperCase();
        if (offerRepository.existsByOfferCodeIgnoreCase(normalizedCode)) {
            throw ApiException.conflict("OFFER_ALREADY_EXISTS",
                    "A loan offer with code '" + normalizedCode + "' already exists.");
        }
        validateDates(request.validFrom(), request.validTo());

        String operator = normalizeActor(actor);
        OfferStatus initialStatus = request.status() != null ? request.status() : OfferStatus.DRAFT;

        LoanOfferCampaign offer = new LoanOfferCampaign();
        offer.setId(UUID.randomUUID());
        offer.setOfferCode(normalizedCode);
        offer.setOfferName(request.offerName().trim());
        offer.setDescription(request.description());
        offer.setStatus(initialStatus);
        offer.setCurrentVersion(1);
        offer.setValidFrom(request.validFrom());
        offer.setValidTo(request.validTo());
        if (initialStatus == OfferStatus.ACTIVE) {
            offer.setActivatedAt(Instant.now());
        }
        offer.setApplicableProductCodes(normalizeUpperList(request.applicableProductCodes()));
        offer.setEligibilityConditions(request.eligibilityConditions());
        offer.setDiscountType(request.discountType());
        offer.setInterestRateDiscount(zeroIfNull(request.interestRateDiscount()));
        offer.setProcessingFeeDiscountPercentage(zeroIfNull(request.processingFeeDiscountPercentage()));
        offer.setProcessingFeeWaiverAmount(zeroIfNull(request.processingFeeWaiverAmount()));
        offer.setCashbackAmount(zeroIfNull(request.cashbackAmount()));
        offer.setCashbackPercentage(zeroIfNull(request.cashbackPercentage()));
        offer.setMaxCashbackAmount(request.maxCashbackAmount());
        offer.setPriority(request.priority() != null ? request.priority() : 100);
        offer.setCreatedBy(operator);
        offer.setUpdatedBy(operator);

        LoanOfferCampaign saved = offerRepository.save(offer);
        recordVersion(saved, operator);

        publishOfferEvent(offerCreatedTopic, LoanConstants.EVT_OFFER_CREATED, saved, operator);
        if (saved.getStatus() == OfferStatus.ACTIVE) {
            publishOfferEvent(offerActivatedTopic, LoanConstants.EVT_OFFER_ACTIVATED, saved, operator);
        }

        notificationService.notifyAdmin(
                "LOAN_OFFER_CREATED",
                "Loan Offer Created: " + saved.getOfferCode(),
                "Admin " + operator + " created offer " + saved.getOfferName() + " (v1, status=" + saved.getStatus() + ").",
                saved.getOfferCode()
        );

        return toResponse(saved);
    }

    @Transactional
    public DynamicOfferResponse updateOffer(String idOrCode, UpdateLoanOfferRequest request, String actor) {
        LoanOfferCampaign offer = resolveOffer(idOrCode);
        String operator = normalizeActor(actor);

        Instant nextFrom = request.validFrom() != null ? request.validFrom() : offer.getValidFrom();
        Instant nextTo = request.validTo() != null ? request.validTo() : offer.getValidTo();
        validateDates(nextFrom, nextTo);

        OfferStatus previousStatus = offer.getStatus();

        if (request.offerName() != null && !request.offerName().isBlank()) offer.setOfferName(request.offerName().trim());
        if (request.description() != null) offer.setDescription(request.description());
        if (request.status() != null) {
            offer.setStatus(request.status());
            if (request.status() == OfferStatus.ACTIVE && previousStatus != OfferStatus.ACTIVE) {
                offer.setActivatedAt(Instant.now());
            }
        }
        offer.setValidFrom(nextFrom);
        offer.setValidTo(nextTo);
        if (request.applicableProductCodes() != null) offer.setApplicableProductCodes(normalizeUpperList(request.applicableProductCodes()));
        if (request.eligibilityConditions() != null) offer.setEligibilityConditions(request.eligibilityConditions());
        if (request.discountType() != null) offer.setDiscountType(request.discountType());
        if (request.interestRateDiscount() != null) offer.setInterestRateDiscount(request.interestRateDiscount());
        if (request.processingFeeDiscountPercentage() != null) offer.setProcessingFeeDiscountPercentage(request.processingFeeDiscountPercentage());
        if (request.processingFeeWaiverAmount() != null) offer.setProcessingFeeWaiverAmount(request.processingFeeWaiverAmount());
        if (request.cashbackAmount() != null) offer.setCashbackAmount(request.cashbackAmount());
        if (request.cashbackPercentage() != null) offer.setCashbackPercentage(request.cashbackPercentage());
        if (request.maxCashbackAmount() != null) offer.setMaxCashbackAmount(request.maxCashbackAmount());
        if (request.priority() != null) offer.setPriority(request.priority());

        // Increment offer version for future applications; NEVER touch existing LoanApplicationOfferSnapshot rows.
        offer.setCurrentVersion(offer.getCurrentVersion() + 1);
        offer.setUpdatedBy(operator);

        LoanOfferCampaign saved = offerRepository.save(offer);
        recordVersion(saved, operator);

        publishOfferEvent(offerUpdatedTopic, LoanConstants.EVT_OFFER_UPDATED, saved, operator);
        if (saved.getStatus() == OfferStatus.ACTIVE && previousStatus != OfferStatus.ACTIVE) {
            publishOfferEvent(offerActivatedTopic, LoanConstants.EVT_OFFER_ACTIVATED, saved, operator);
        } else if (saved.getStatus() != OfferStatus.ACTIVE && previousStatus == OfferStatus.ACTIVE) {
            publishOfferEvent(offerDeactivatedTopic, LoanConstants.EVT_OFFER_DEACTIVATED, saved, operator);
        }

        notificationService.notifyAdmin(
                "LOAN_OFFER_UPDATED",
                "Loan Offer Updated: " + saved.getOfferCode() + " (v" + saved.getCurrentVersion() + ")",
                "Offer " + saved.getOfferCode() + " updated to version " + saved.getCurrentVersion()
                        + " by " + operator + ". Applies only to new applications.",
                saved.getOfferCode()
        );

        return toResponse(saved);
    }

    @Transactional
    public DynamicOfferResponse activateOffer(String idOrCode, String actor) {
        LoanOfferCampaign offer = resolveOffer(idOrCode);
        String operator = normalizeActor(actor);

        if (offer.getValidTo().isBefore(Instant.now())) {
            throw ApiException.unprocessable("OFFER_ALREADY_EXPIRED",
                    "Cannot activate offer '" + offer.getOfferCode() + "' because its validTo timestamp has already passed.");
        }

        offer.setStatus(OfferStatus.ACTIVE);
        offer.setActivatedAt(Instant.now());
        offer.setUpdatedBy(operator);
        LoanOfferCampaign saved = offerRepository.save(offer);

        publishOfferEvent(offerActivatedTopic, LoanConstants.EVT_OFFER_ACTIVATED, saved, operator);
        notificationService.notifyAdmin(
                "LOAN_OFFER_ACTIVATED",
                "Loan Offer Activated: " + saved.getOfferCode(),
                "Offer " + saved.getOfferCode() + " v" + saved.getCurrentVersion() + " is now ACTIVE for new applications.",
                saved.getOfferCode()
        );
        return toResponse(saved);
    }

    @Transactional
    public DynamicOfferResponse deactivateOffer(String idOrCode, String actor) {
        LoanOfferCampaign offer = resolveOffer(idOrCode);
        String operator = normalizeActor(actor);

        offer.setStatus(OfferStatus.INACTIVE);
        offer.setUpdatedBy(operator);
        LoanOfferCampaign saved = offerRepository.save(offer);

        publishOfferEvent(offerDeactivatedTopic, LoanConstants.EVT_OFFER_DEACTIVATED, saved, operator);
        notificationService.notifyAdmin(
                "LOAN_OFFER_DEACTIVATED",
                "Loan Offer Deactivated: " + saved.getOfferCode(),
                "Offer " + saved.getOfferCode() + " has been deactivated. Existing applications retain their locked offer snapshots.",
                saved.getOfferCode()
        );
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public DynamicOfferResponse getOffer(String idOrCode) {
        return toResponse(resolveOffer(idOrCode));
    }

    @Transactional(readOnly = true)
    public List<OfferVersionResponse> getOfferVersions(String idOrCode) {
        LoanOfferCampaign offer = resolveOffer(idOrCode);
        return versionRepository.findByOfferIdOrderByVersionNumberDesc(offer.getId()).stream()
                .map(this::toVersionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<DynamicOfferResponse> listAdminOffers(OfferStatus status, String search, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = (size <= 0 || size > LoanConstants.MAX_PAGE_SIZE) ? LoanConstants.DEFAULT_PAGE_SIZE : size;
        String searchParam = (search != null && !search.isBlank()) ? search.trim() : "";

        Page<LoanOfferCampaign> paged = offerRepository.findAdminOffers(
                status, searchParam, PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "priority")));
        return PagedResponse.of(paged.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public List<DynamicOfferResponse> getActiveOffersForProduct(String productCode) {
        Instant now = Instant.now();
        return offerRepository.findCurrentlyActiveOffers(OfferStatus.ACTIVE, now).stream()
                .filter(o -> o.getActivatedAt() == null || !o.getActivatedAt().isAfter(now))
                .filter(o -> isApplicableToProduct(o, productCode))
                .map(this::toResponse)
                .toList();
    }

    /**
     * Server-side offer evaluation & immutable snapshot creation during loan application submission.
     * Enforces:
     * 1. Only ACTIVE, non-expired offers whose activatedAt <= applicationTimestamp apply.
     * 2. Eligibility conditions checked strictly server-side.
     * 3. Creates an immutable LoanApplicationOfferSnapshot locking offerId, version, benefits, and timestamp.
     */
    @Transactional
    public Optional<LoanApplicationOfferSnapshot> evaluateAndSnapshotBestOffer(
            String loanApplicationId,
            LoanProduct product,
            BigDecimal baseRate,
            BigDecimal originalProcessingFee,
            BigDecimal requestedAmount,
            Integer tenureMonths,
            BigDecimal monthlyIncome,
            String employmentType,
            Instant applicationTimestamp) {

        Instant evalTime = applicationTimestamp != null ? applicationTimestamp : Instant.now();
        List<LoanOfferCampaign> candidates = offerRepository.findCurrentlyActiveOffers(OfferStatus.ACTIVE, evalTime).stream()
                .filter(o -> o.getActivatedAt() == null || !o.getActivatedAt().isAfter(evalTime))
                .filter(o -> isApplicableToProduct(o, product.getProductCode()))
                .filter(o -> satisfiesEligibilityConditions(o, requestedAmount, tenureMonths, monthlyIncome, employmentType))
                .toList();

        if (candidates.isEmpty()) {
            return Optional.empty();
        }

        // Select highest-priority (lowest priority number) eligible offer
        LoanOfferCampaign selected = candidates.get(0);

        BigDecimal rateDiscount = zeroIfNull(selected.getInterestRateDiscount());
        BigDecimal effectiveRate = baseRate.subtract(rateDiscount);
        if (effectiveRate.compareTo(BigDecimal.ZERO) < 0) {
            effectiveRate = BigDecimal.ZERO;
        }
        effectiveRate = effectiveRate.setScale(2, RoundingMode.HALF_UP);

        BigDecimal feeDiscountPct = zeroIfNull(selected.getProcessingFeeDiscountPercentage());
        BigDecimal feeWaiver = zeroIfNull(selected.getProcessingFeeWaiverAmount());
        BigDecimal discountedFee = originalProcessingFee;

        if (feeDiscountPct.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal reduction = originalProcessingFee.multiply(feeDiscountPct)
                    .divide(LoanConstants.HUNDRED, 2, RoundingMode.HALF_UP);
            discountedFee = discountedFee.subtract(reduction);
        }
        if (feeWaiver.compareTo(BigDecimal.ZERO) > 0) {
            discountedFee = discountedFee.subtract(feeWaiver);
        }
        if (discountedFee.compareTo(BigDecimal.ZERO) < 0) {
            discountedFee = BigDecimal.ZERO;
        }
        discountedFee = discountedFee.setScale(2, RoundingMode.HALF_UP);

        BigDecimal cashback = computeCashback(selected, requestedAmount);

        Map<String, Object> benefitDetails = new LinkedHashMap<>();
        benefitDetails.put("offerCode", selected.getOfferCode());
        benefitDetails.put("offerName", selected.getOfferName());
        benefitDetails.put("offerVersion", selected.getCurrentVersion());
        benefitDetails.put("discountType", selected.getDiscountType().name());
        benefitDetails.put("baseInterestRate", baseRate);
        benefitDetails.put("effectiveInterestRate", effectiveRate);
        benefitDetails.put("originalProcessingFee", originalProcessingFee);
        benefitDetails.put("discountedProcessingFee", discountedFee);
        benefitDetails.put("cashbackAmount", cashback);

        LoanApplicationOfferSnapshot snapshot = new LoanApplicationOfferSnapshot();
        snapshot.setId(UUID.randomUUID());
        snapshot.setLoanApplicationId(loanApplicationId);
        snapshot.setOfferId(selected.getId());
        snapshot.setOfferCode(selected.getOfferCode());
        snapshot.setOfferName(selected.getOfferName());
        snapshot.setOfferVersion(selected.getCurrentVersion());
        snapshot.setDiscountType(selected.getDiscountType());
        snapshot.setInterestRateDiscount(rateDiscount);
        snapshot.setProcessingFeeDiscountPercentage(feeDiscountPct);
        snapshot.setProcessingFeeWaiverAmount(feeWaiver);
        snapshot.setCashbackAmount(cashback);
        snapshot.setEffectiveInterestRate(effectiveRate);
        snapshot.setOriginalProcessingFee(originalProcessingFee);
        snapshot.setDiscountedProcessingFee(discountedFee);
        snapshot.setBenefitDetails(benefitDetails);
        snapshot.setAppliedAt(evalTime);

        LoanApplicationOfferSnapshot savedSnapshot = snapshotRepository.save(snapshot);
        log.info("Locked offer snapshot for application {}: offerCode={}, version={}, effectiveRate={}, discountedFee={}",
                loanApplicationId, selected.getOfferCode(), selected.getCurrentVersion(), effectiveRate, discountedFee);

        return Optional.of(savedSnapshot);
    }

    @Transactional(readOnly = true)
    public Optional<ApplicationOfferSnapshotResponse> getApplicationOfferSnapshot(String loanApplicationId) {
        return snapshotRepository.findByLoanApplicationId(loanApplicationId).map(this::toSnapshotResponse);
    }

    // =====================================================================
    // Private Helpers
    // =====================================================================

    private boolean isApplicableToProduct(LoanOfferCampaign offer, String productCode) {
        if (productCode == null || productCode.isBlank()) {
            return true;
        }
        List<String> products = offer.getApplicableProductCodes();
        if (products == null || products.isEmpty()) {
            return true;
        }
        return products.stream().anyMatch(code -> code.equalsIgnoreCase(productCode.trim()));
    }

    private boolean satisfiesEligibilityConditions(
            LoanOfferCampaign offer,
            BigDecimal requestedAmount,
            Integer tenureMonths,
            BigDecimal monthlyIncome,
            String employmentType) {
        Map<String, Object> cond = offer.getEligibilityConditions();
        if (cond == null || cond.isEmpty()) {
            return true;
        }

        if (cond.containsKey("minLoanAmount") && requestedAmount != null) {
            BigDecimal minAmt = toBigDecimal(cond.get("minLoanAmount"));
            if (minAmt != null && requestedAmount.compareTo(minAmt) < 0) return false;
        }
        if (cond.containsKey("maxLoanAmount") && requestedAmount != null) {
            BigDecimal maxAmt = toBigDecimal(cond.get("maxLoanAmount"));
            if (maxAmt != null && requestedAmount.compareTo(maxAmt) > 0) return false;
        }
        if (cond.containsKey("minMonthlyIncome") && monthlyIncome != null) {
            BigDecimal minIncome = toBigDecimal(cond.get("minMonthlyIncome"));
            if (minIncome != null && monthlyIncome.compareTo(minIncome) < 0) return false;
        }
        if (cond.containsKey("minTenureMonths") && tenureMonths != null) {
            Integer minTenure = toInteger(cond.get("minTenureMonths"));
            if (minTenure != null && tenureMonths < minTenure) return false;
        }
        if (cond.containsKey("employmentTypes") && cond.get("employmentTypes") instanceof List<?> list && !list.isEmpty()) {
            if (employmentType == null) return false;
            boolean match = list.stream().anyMatch(item -> employmentType.equalsIgnoreCase(String.valueOf(item)));
            if (!match) return false;
        }
        return true;
    }

    private BigDecimal computeCashback(LoanOfferCampaign offer, BigDecimal requestedAmount) {
        BigDecimal flat = zeroIfNull(offer.getCashbackAmount());
        BigDecimal pct = zeroIfNull(offer.getCashbackPercentage());
        BigDecimal pctCashback = BigDecimal.ZERO;
        if (pct.compareTo(BigDecimal.ZERO) > 0 && requestedAmount != null) {
            pctCashback = requestedAmount.multiply(pct).divide(LoanConstants.HUNDRED, 2, RoundingMode.HALF_UP);
            if (offer.getMaxCashbackAmount() != null && offer.getMaxCashbackAmount().compareTo(BigDecimal.ZERO) > 0
                    && pctCashback.compareTo(offer.getMaxCashbackAmount()) > 0) {
                pctCashback = offer.getMaxCashbackAmount();
            }
        }
        return flat.add(pctCashback).setScale(2, RoundingMode.HALF_UP);
    }

    private void recordVersion(LoanOfferCampaign offer, String actor) {
        LoanOfferVersion ver = new LoanOfferVersion();
        ver.setId(UUID.randomUUID());
        ver.setOfferId(offer.getId());
        ver.setOfferCode(offer.getOfferCode());
        ver.setVersionNumber(offer.getCurrentVersion());
        ver.setStatus(offer.getStatus());
        ver.setValidFrom(offer.getValidFrom());
        ver.setValidTo(offer.getValidTo());
        ver.setApplicableProductCodes(offer.getApplicableProductCodes());
        ver.setEligibilityConditions(offer.getEligibilityConditions());
        ver.setDiscountType(offer.getDiscountType());
        ver.setInterestRateDiscount(offer.getInterestRateDiscount());
        ver.setProcessingFeeDiscountPercentage(offer.getProcessingFeeDiscountPercentage());
        ver.setProcessingFeeWaiverAmount(offer.getProcessingFeeWaiverAmount());
        ver.setCashbackAmount(offer.getCashbackAmount());
        ver.setCashbackPercentage(offer.getCashbackPercentage());
        ver.setMaxCashbackAmount(offer.getMaxCashbackAmount());

        Map<String, Object> snap = new LinkedHashMap<>();
        snap.put("offerCode", offer.getOfferCode());
        snap.put("offerName", offer.getOfferName());
        snap.put("version", offer.getCurrentVersion());
        snap.put("status", offer.getStatus().name());
        snap.put("discountType", offer.getDiscountType().name());
        snap.put("interestRateDiscount", offer.getInterestRateDiscount());
        snap.put("processingFeeDiscountPercentage", offer.getProcessingFeeDiscountPercentage());
        snap.put("processingFeeWaiverAmount", offer.getProcessingFeeWaiverAmount());
        snap.put("cashbackAmount", offer.getCashbackAmount());
        ver.setSnapshotJson(snap);
        ver.setCreatedBy(actor);
        versionRepository.save(ver);
    }

    private LoanOfferCampaign resolveOffer(String idOrCode) {
        try {
            UUID uuid = UUID.fromString(idOrCode.trim());
            return offerRepository.findById(uuid)
                    .orElseThrow(() -> ApiException.notFound("OFFER_NOT_FOUND", "Loan offer not found: " + idOrCode));
        } catch (IllegalArgumentException ignored) {
            return offerRepository.findByOfferCodeIgnoreCase(idOrCode.trim())
                    .orElseThrow(() -> ApiException.notFound("OFFER_NOT_FOUND", "Loan offer not found: " + idOrCode));
        }
    }

    private void validateDates(Instant validFrom, Instant validTo) {
        if (validFrom == null || validTo == null || !validTo.isAfter(validFrom)) {
            throw ApiException.badRequest("INVALID_OFFER_VALIDITY", "validTo must be strictly after validFrom.");
        }
    }

    private void publishOfferEvent(String topic, String eventType, LoanOfferCampaign offer, String actor) {
        LoanEvents.LoanOfferLifecyclePayload payload = new LoanEvents.LoanOfferLifecyclePayload(
                offer.getId().toString(),
                offer.getOfferCode(),
                offer.getOfferName(),
                offer.getCurrentVersion(),
                offer.getStatus().name(),
                offer.getValidFrom(),
                offer.getValidTo(),
                actor,
                Instant.now()
        );
        outboxService.enqueueEvent(topic, offer.getOfferCode(), "LOAN_OFFER", eventType, payload);
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return null;
        try {
            return new BigDecimal(String.valueOf(val));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer toInteger(Object val) {
        if (val == null) return null;
        try {
            return Integer.valueOf(String.valueOf(val));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private List<String> normalizeUpperList(List<String> input) {
        if (input == null) return List.of();
        return input.stream().filter(Objects::nonNull).map(s -> s.trim().toUpperCase())
                .filter(s -> !s.isBlank()).distinct().toList();
    }

    private String normalizeActor(String actor) {
        return (actor != null && !actor.isBlank()) ? actor : "ADMIN";
    }

    private DynamicOfferResponse toResponse(LoanOfferCampaign o) {
        return new DynamicOfferResponse(
                o.getId(), o.getOfferCode(), o.getOfferName(), o.getDescription(),
                o.getStatus(), o.getCurrentVersion(), o.getValidFrom(), o.getValidTo(), o.getActivatedAt(),
                o.getApplicableProductCodes(), o.getEligibilityConditions(), o.getDiscountType(),
                o.getInterestRateDiscount(), o.getProcessingFeeDiscountPercentage(), o.getProcessingFeeWaiverAmount(),
                o.getCashbackAmount(), o.getCashbackPercentage(), o.getMaxCashbackAmount(), o.getPriority(),
                o.getCreatedAt(), o.getUpdatedAt(), o.getCreatedBy(), o.getUpdatedBy()
        );
    }

    private OfferVersionResponse toVersionResponse(LoanOfferVersion v) {
        return new OfferVersionResponse(
                v.getId(), v.getOfferId(), v.getOfferCode(), v.getVersionNumber(),
                v.getStatus(), v.getValidFrom(), v.getValidTo(),
                v.getApplicableProductCodes(), v.getEligibilityConditions(), v.getDiscountType(),
                v.getInterestRateDiscount(), v.getProcessingFeeDiscountPercentage(), v.getProcessingFeeWaiverAmount(),
                v.getCashbackAmount(), v.getCashbackPercentage(), v.getMaxCashbackAmount(),
                v.getCreatedBy(), v.getCreatedAt()
        );
    }

    private ApplicationOfferSnapshotResponse toSnapshotResponse(LoanApplicationOfferSnapshot s) {
        return new ApplicationOfferSnapshotResponse(
                s.getId(), s.getLoanApplicationId(), s.getOfferId(), s.getOfferCode(), s.getOfferName(),
                s.getOfferVersion(), s.getDiscountType(), s.getInterestRateDiscount(),
                s.getProcessingFeeDiscountPercentage(), s.getProcessingFeeWaiverAmount(),
                s.getCashbackAmount(), s.getEffectiveInterestRate(),
                s.getOriginalProcessingFee(), s.getDiscountedProcessingFee(),
                s.getBenefitDetails(), s.getAppliedAt()
        );
    }
}
