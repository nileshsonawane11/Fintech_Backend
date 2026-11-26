package com.fintech.loan.service;

import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.CustomerServiceClient;
import com.fintech.loan.client.dto.CustomerKycContext;
import com.fintech.loan.client.dto.CustomerProfileDto;
import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.client.dto.KycDocumentDto;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.LoanApplicationRequest;
import com.fintech.loan.dto.response.DynamicOfferResponses.ApplicationOfferSnapshotResponse;
import com.fintech.loan.dto.response.LoanApplicationResponse;
import com.fintech.loan.dto.response.LoanApplicationResponse.LoanDocumentResponse;
import com.fintech.loan.dto.response.LoanApplicationResponse.LoanHistoryResponse;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.LoanApplicationStatus;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class LoanApplicationService {

    private static final Logger log = LoggerFactory.getLogger(LoanApplicationService.class);

    private final LoanApplicationRepository applicationRepository;
    private final LoanProductService productService;
    private final LoanProductFeeRepository feeRepository;
    private final LoanApplicationHistoryRepository historyRepository;
    private final LoanDocumentRepository documentRepository;
    private final LoanOfferRepository sanctionedOfferRepository;
    private final DynamicLoanOfferService dynamicOfferService;
    private final LoanFinancialCalculator calculator;
    private final LoanIdempotencyService idempotencyService;
    private final CustomerServiceClient customerServiceClient;
    private final AccountServiceClient accountServiceClient;
    private final LoanOutboxService outboxService;
    private final LoanNotificationService notificationService;
    private final String applicationSubmittedTopic;

    public LoanApplicationService(
            LoanApplicationRepository applicationRepository,
            LoanProductService productService,
            LoanProductFeeRepository feeRepository,
            LoanApplicationHistoryRepository historyRepository,
            LoanDocumentRepository documentRepository,
            LoanOfferRepository sanctionedOfferRepository,
            DynamicLoanOfferService dynamicOfferService,
            LoanFinancialCalculator calculator,
            LoanIdempotencyService idempotencyService,
            CustomerServiceClient customerServiceClient,
            AccountServiceClient accountServiceClient,
            LoanOutboxService outboxService,
            LoanNotificationService notificationService,
            @Value("${app.kafka.topics.application-submitted:" + LoanConstants.TOPIC_APPLICATION_SUBMITTED + "}")
            String applicationSubmittedTopic) {
        this.applicationRepository = applicationRepository;
        this.productService = productService;
        this.feeRepository = feeRepository;
        this.historyRepository = historyRepository;
        this.documentRepository = documentRepository;
        this.sanctionedOfferRepository = sanctionedOfferRepository;
        this.dynamicOfferService = dynamicOfferService;
        this.calculator = calculator;
        this.idempotencyService = idempotencyService;
        this.customerServiceClient = customerServiceClient;
        this.accountServiceClient = accountServiceClient;
        this.outboxService = outboxService;
        this.notificationService = notificationService;
        this.applicationSubmittedTopic = applicationSubmittedTopic;
    }

    @Transactional
    public LoanApplicationResponse applyForLoan(LoanApplicationRequest request,
                                                String idempotencyKey,
                                                String identitySubject) {
        if (identitySubject == null || identitySubject.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED",
                    "Authenticated customer identity is required.");
        }

        // 1. Idempotency check
        String requestHash = idempotencyService.computeHash(request);
        Optional<LoanApplicationResponse> cached = idempotencyService.findReplay(
                idempotencyKey, "LOAN_APPLICATION", identitySubject, requestHash, LoanApplicationResponse.class);
        if (cached.isPresent()) {
            return cached.get();
        }

        // 2. Consent check (if explicitly false, reject)
        if (Boolean.FALSE.equals(request.getCreditBureauConsent())) {
            throw ApiException.unprocessable("CREDIT_BUREAU_CONSENT_REQUIRED",
                    "Credit bureau consent is required to process loan application.");
        }

        // 3. Validate loan product is active & non-deleted
        LoanProduct product = productService.findActiveProductOrThrow(request.getProductCode());
        LoanProductFee productFee = feeRepository.findByProductId(product.getId()).orElse(null);

        // 4. Validate request financial & product parameters
        BigDecimal requestedAmount = request.getEffectiveRequestedAmount();
        if (requestedAmount == null || requestedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_LOAN_AMOUNT", "Requested loan amount must be positive.");
        }
        if (requestedAmount.compareTo(product.getMinimumLoanAmount()) < 0
                || requestedAmount.compareTo(product.getMaximumLoanAmount()) > 0) {
            throw ApiException.unprocessable("AMOUNT_OUT_OF_RANGE",
                    String.format("Requested amount %s must be between %s and %s for %s.",
                            requestedAmount, product.getMinimumLoanAmount(), product.getMaximumLoanAmount(), product.getProductCode()));
        }

        Integer tenureMonths = request.getTenureMonths();
        if (tenureMonths == null || tenureMonths < product.getMinimumTenureMonths()
                || tenureMonths > product.getMaximumTenureMonths()) {
            throw ApiException.unprocessable("TENURE_OUT_OF_RANGE",
                    String.format("Tenure must be between %d and %d months for %s.",
                            product.getMinimumTenureMonths(), product.getMaximumTenureMonths(), product.getProductCode()));
        }

        BigDecimal monthlyIncome = request.getEffectiveMonthlyIncome();
        if (monthlyIncome == null || monthlyIncome.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("MONTHLY_INCOME_REQUIRED", "Valid monthly income is required.");
        }
        if (product.getMinimumMonthlyIncome() != null
                && monthlyIncome.compareTo(product.getMinimumMonthlyIncome()) < 0) {
            throw ApiException.unprocessable("INSUFFICIENT_INCOME",
                    String.format("Minimum monthly income of %s is required for %s.",
                            product.getMinimumMonthlyIncome(), product.getProductCode()));
        }

        BigDecimal existingEmis = request.getExistingMonthlyEMIs() != null
                ? request.getExistingMonthlyEMIs() : BigDecimal.ZERO;
        if (existingEmis.compareTo(BigDecimal.ZERO) < 0) {
            throw ApiException.badRequest("INVALID_EXISTING_EMIS", "Existing monthly EMIs cannot be negative.");
        }

        String employmentType = request.getEffectiveEmploymentType();
        if (employmentType == null || employmentType.isBlank()) {
            throw ApiException.badRequest("EMPLOYMENT_TYPE_REQUIRED", "Employment type is required.");
        }
        if (product.getEmploymentTypes() != null && !product.getEmploymentTypes().isEmpty()
                && product.getEmploymentTypes().stream().noneMatch(e -> e.equalsIgnoreCase(employmentType))) {
            throw ApiException.unprocessable("EMPLOYMENT_TYPE_NOT_ELIGIBLE",
                    "Employment type '" + employmentType + "' is not eligible for product " + product.getProductCode() + ".");
        }

        String loanPurpose = request.getEffectiveLoanPurpose();
        if (loanPurpose != null && !loanPurpose.isBlank()
                && product.getEligibleLoanPurposes() != null && !product.getEligibleLoanPurposes().isEmpty()) {
            boolean purposeMatches = product.getEligibleLoanPurposes().stream()
                    .anyMatch(p -> p.equalsIgnoreCase(loanPurpose));
            if (!purposeMatches) {
                throw ApiException.unprocessable("LOAN_PURPOSE_NOT_ELIGIBLE",
                        "Loan purpose '" + loanPurpose + "' is not eligible for product " + product.getProductCode() + ".");
            }
        }

        BigDecimal ltv = null;
        if (request.getCollateralValue() != null) {
            if (request.getCollateralValue().compareTo(BigDecimal.ZERO) <= 0) {
                throw ApiException.badRequest("INVALID_COLLATERAL_VALUE", "Collateral value must be positive.");
            }
            ltv = calculator.calculateLtvPercentage(requestedAmount, request.getCollateralValue());
            if (product.getMaximumLTVPercentage() != null && ltv != null
                    && ltv.compareTo(product.getMaximumLTVPercentage()) > 0) {
                throw ApiException.unprocessable("LTV_EXCEEDED",
                        String.format("Calculated LTV (%s%%) exceeds product maximum LTV (%s%%).",
                                ltv, product.getMaximumLTVPercentage()));
            }
        }

        // 5. Verify Customer & KYC via Customer Service
        CustomerKycContext kycContext = customerServiceClient.verifyCustomerAndFetchKyc(identitySubject);
        CustomerProfileDto profile = kycContext.profile();
        String canonicalCustomerId = (profile.customerId() != null && !profile.customerId().isBlank())
                ? profile.customerId()
                : identitySubject;

        // 6. Verify Disbursement Account ownership, status, and eligibility via Account Service
        String disbursementAccountIdentifier = request.getEffectiveDisbursementAccountIdentifier();
        InternalAccountDto account = accountServiceClient.validateDisbursementAccount(
                disbursementAccountIdentifier,
                identitySubject,
                canonicalCustomerId,
                product.getCurrency()
        );

        // 7. Financial calculations & Dynamic Offer snapshot (non-retroactive)
        Instant submissionTime = Instant.now();
        String loanApplicationId = "LN-APP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        BigDecimal baseInterestRate = product.getMinimumInterestRate();
        BigDecimal originalProcessingFee = calculator.calculateProcessingFee(requestedAmount, productFee);

        Optional<LoanApplicationOfferSnapshot> offerSnapshotOpt = dynamicOfferService.evaluateAndSnapshotBestOffer(
                loanApplicationId,
                product,
                baseInterestRate,
                originalProcessingFee,
                requestedAmount,
                tenureMonths,
                monthlyIncome,
                employmentType,
                submissionTime
        );

        BigDecimal effectiveRate = offerSnapshotOpt
                .map(LoanApplicationOfferSnapshot::getEffectiveInterestRate)
                .orElse(baseInterestRate);
        BigDecimal effectiveProcessingFee = offerSnapshotOpt
                .map(LoanApplicationOfferSnapshot::getDiscountedProcessingFee)
                .orElse(originalProcessingFee);

        BigDecimal indicativeEmi = calculator.calculateEmi(
                requestedAmount, effectiveRate, tenureMonths, product.getInterestCalculationMethod());
        BigDecimal calculatedFoir = calculator.calculateFoirPercentage(monthlyIncome, existingEmis, indicativeEmi);

        BigDecimal maxFoir = product.getMaxFoirPercentage() != null
                ? product.getMaxFoirPercentage()
                : LoanConstants.DEFAULT_MAX_FOIR_PERCENTAGE;
        if (calculatedFoir.compareTo(maxFoir) > 0) {
            throw ApiException.unprocessable("FOIR_EXCEEDED",
                    String.format("Debt-to-income ratio (FOIR %s%% including indicative EMI %s) exceeds maximum allowed %s%%.",
                            calculatedFoir, indicativeEmi, maxFoir));
        }

        // 8. Persist LoanApplication
        LoanApplication app = new LoanApplication();
        app.setId(UUID.randomUUID().toString());
        app.setLoanApplicationId(loanApplicationId);
        app.setIdentitySubject(identitySubject);
        app.setCustomerId(canonicalCustomerId);
        app.setCustomerName(profile.fullName());
        app.setKycStatus(profile.kycStatus());
        app.setKycCaseId(kycContext.kycCase() != null ? kycContext.kycCase().kycCaseId() : null);
        app.setProductCode(product.getProductCode());
        app.setRequestedAmount(requestedAmount);
        app.setTenureMonths(tenureMonths);
        app.setCurrency(product.getCurrency());
        app.setPurpose(loanPurpose);
        app.setCreditBureauConsent(request.getCreditBureauConsent() == null || request.getCreditBureauConsent());
        app.setEmploymentType(employmentType);
        app.setMonthlyIncome(monthlyIncome);
        app.setExistingMonthlyEmis(existingEmis);
        app.setEmployerName(request.getEffectiveEmployerName());
        app.setDisbursementAccountId(account.accountId());
        app.setDisbursementAccountNumber(account.accountNumberMasked());
        app.setIndicativeEmi(indicativeEmi);
        app.setCalculatedFoir(calculatedFoir);
        app.setBaseInterestRate(baseInterestRate);
        app.setEffectiveInterestRate(effectiveRate);
        app.setProcessingFeeAmount(effectiveProcessingFee);
        app.setCollateralValue(request.getCollateralValue());
        app.setLtvPercentage(ltv);
        app.setAdditionalDetails(request.getAdditionalDetails());
        app.setStatus(LoanApplicationStatus.SUBMITTED.name());
        app.setCreditAssessmentStatus("QUEUED_FOR_UNDERWRITING");
        app.setCreatedAt(submissionTime);
        app.setUpdatedAt(submissionTime);

        LoanApplication saved = applicationRepository.save(app);

        // 9. Attach verified KYC documents automatically (do not re-ask customer)
        List<LoanDocument> attachedDocs = new ArrayList<>();
        if (kycContext.documents() != null) {
            for (KycDocumentDto kycDoc : kycContext.documents()) {
                LoanDocument doc = new LoanDocument();
                doc.setId(UUID.randomUUID());
                doc.setLoanApplicationId(loanApplicationId);
                doc.setDocumentType(kycDoc.documentType() != null ? kycDoc.documentType() : "KYC_DOCUMENT");
                doc.setDocumentReferenceId(kycDoc.documentReferenceId() != null
                        ? kycDoc.documentReferenceId() : UUID.randomUUID().toString());
                doc.setFileName(kycDoc.fileName());
                doc.setSource("KYC_VERIFIED");
                doc.setVerificationStatus("VERIFIED");
                doc.setVerifiedBy("KYC_SERVICE");
                doc.setVerifiedAt(submissionTime);
                attachedDocs.add(documentRepository.save(doc));
            }
        }

        // 10. Record Application History
        LoanApplicationHistory history = LoanApplicationHistory.record(
                loanApplicationId,
                null,
                LoanApplicationStatus.SUBMITTED.name(),
                identitySubject,
                LoanConstants.ROLE_CUSTOMER,
                "Loan application submitted with verified KYC and disbursement account.",
                "APPLICATION_SUBMITTED"
        );
        historyRepository.save(history);

        // 11. Enqueue Outbox Domain Event & Role-Aware Notifications
        LoanEvents.LoanApplicationSubmittedPayload submittedPayload = new LoanEvents.LoanApplicationSubmittedPayload(
                loanApplicationId,
                canonicalCustomerId,
                identitySubject,
                product.getProductCode(),
                requestedAmount,
                tenureMonths,
                account.accountId(),
                indicativeEmi,
                calculatedFoir,
                offerSnapshotOpt.map(LoanApplicationOfferSnapshot::getOfferCode).orElse(null),
                offerSnapshotOpt.map(LoanApplicationOfferSnapshot::getOfferVersion).orElse(null),
                submissionTime
        );
        outboxService.enqueueEvent(
                applicationSubmittedTopic,
                loanApplicationId,
                "LOAN_APPLICATION",
                LoanConstants.EVT_APPLICATION_SUBMITTED,
                submittedPayload
        );

        notificationService.notifyCustomer(
                identitySubject,
                "LOAN_APPLICATION_SUBMITTED",
                "Loan Application Submitted: " + loanApplicationId,
                "Your " + product.getProductName() + " application (" + loanApplicationId + ") for "
                        + product.getCurrency() + " " + requestedAmount + " has been submitted and queued for review.",
                loanApplicationId
        );
        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_OFFICER,
                null,
                "NEW_LOAN_APPLICATION_QUEUE",
                "New Loan Application Submitted: " + loanApplicationId,
                "Application " + loanApplicationId + " (" + product.getProductCode() + ", amount "
                        + requestedAmount + ") is awaiting officer review.",
                loanApplicationId
        );

        LoanApplicationResponse response = buildResponse(
                saved,
                offerSnapshotOpt.map(s -> dynamicOfferService.getApplicationOfferSnapshot(loanApplicationId).orElse(null)).orElse(null),
                attachedDocs,
                List.of(history)
        );

        idempotencyService.record(idempotencyKey, "LOAN_APPLICATION", identitySubject,
                requestHash, loanApplicationId, response);

        log.info("Loan application submitted successfully: appId={}, customerId={}, product={}, amount={}",
                loanApplicationId, canonicalCustomerId, product.getProductCode(), requestedAmount);
        return response;
    }

    @Transactional(readOnly = true)
    public List<LoanApplicationResponse> getMyApplications(String identitySubject) {
        List<LoanApplication> apps = applicationRepository
                .findByIdentitySubjectOrCustomerIdOrderByCreatedAtDesc(identitySubject, identitySubject);
        return apps.stream().map(this::toDetailResponse).toList();
    }

    @Transactional(readOnly = true)
    public LoanApplicationResponse getApplicationDetails(String loanApplicationId, String actorSubject, boolean isStaff) {
        LoanApplication app = applicationRepository.findByLoanApplicationId(loanApplicationId)
                .orElseThrow(() -> ApiException.notFound("APPLICATION_NOT_FOUND",
                        "Loan application not found: " + loanApplicationId));

        if (!isStaff && !isOwner(app, actorSubject)) {
            throw ApiException.forbidden("ACCESS_DENIED",
                    "You do not have permission to access loan application: " + loanApplicationId);
        }
        return toDetailResponse(app);
    }

    @Transactional(readOnly = true)
    public PagedResponse<LoanApplicationResponse> listStaffApplications(
            String status,
            String productCode,
            String assignedOfficerId,
            int page,
            int size) {

        int safePage = Math.max(0, page);

        int safeSize = (size <= 0 || size > LoanConstants.MAX_PAGE_SIZE)
                ? LoanConstants.DEFAULT_PAGE_SIZE
                : size;

        String normalizedStatus = (status == null || status.isBlank())
                ? null
                : status.trim().toUpperCase();

        String normalizedProductCode = (productCode == null || productCode.isBlank())
                ? null
                : productCode.trim().toUpperCase();

        String normalizedOfficerId = (assignedOfficerId == null || assignedOfficerId.isBlank())
                ? null
                : assignedOfficerId.trim();

        Page<LoanApplication> paged = applicationRepository.findOpsApplications(
                normalizedStatus,
                normalizedProductCode,
                normalizedOfficerId,
                PageRequest.of(
                        safePage,
                        safeSize,
                        Sort.by(Sort.Direction.DESC, "createdAt")
                )
        );

        return PagedResponse.of(paged.map(this::toDetailResponse));
    }

    public boolean isOwner(LoanApplication app, String subject) {
        if (subject == null || subject.isBlank()) return false;
        return (app.getIdentitySubject() != null && app.getIdentitySubject().equalsIgnoreCase(subject))
                || (app.getCustomerId() != null && app.getCustomerId().equalsIgnoreCase(subject));
    }

    public LoanApplicationResponse toDetailResponse(LoanApplication app) {
        ApplicationOfferSnapshotResponse offerSnap =
                dynamicOfferService.getApplicationOfferSnapshot(app.getLoanApplicationId()).orElse(null);
        List<LoanDocument> docs = documentRepository.findByLoanApplicationIdOrderByCreatedAtAsc(app.getLoanApplicationId());
        List<LoanApplicationHistory> history = historyRepository.findByLoanApplicationIdOrderByChangedAtAsc(app.getLoanApplicationId());
        return buildResponse(app, offerSnap, docs, history);
    }

    private LoanApplicationResponse buildResponse(
            LoanApplication app,
            ApplicationOfferSnapshotResponse offerSnapshot,
            List<LoanDocument> docs,
            List<LoanApplicationHistory> history) {
        LoanApplicationResponse resp = new LoanApplicationResponse(
                app.getLoanApplicationId(),
                app.getStatus(),
                app.getCreditAssessmentStatus(),
                app.getEstimatedDecisionTime()
        );
        resp.setCustomerId(app.getCustomerId());
        resp.setProductCode(app.getProductCode());
        resp.setRequestedAmount(app.getRequestedAmount());
        resp.setTenureMonths(app.getTenureMonths());
        resp.setCurrency(app.getCurrency());
        resp.setBaseInterestRate(app.getBaseInterestRate());
        resp.setEffectiveInterestRate(app.getEffectiveInterestRate());
        resp.setIndicativeEmi(app.getIndicativeEmi());
        resp.setCalculatedFoir(app.getCalculatedFoir());
        resp.setProcessingFeeAmount(app.getProcessingFeeAmount());
        resp.setDisbursementAccountId(app.getDisbursementAccountId());
        resp.setKycStatus(app.getKycStatus());
        resp.setKycCaseId(app.getKycCaseId());
        resp.setAppliedOffer(offerSnapshot);
        sanctionedOfferRepository.findFirstByLoanApplicationIdOrderByCreatedAtDesc(app.getLoanApplicationId())
                .ifPresent(o -> resp.setOfferId(o.getOfferId()));
        resp.setDocuments(docs.stream().map(d -> new LoanDocumentResponse(
                d.getDocumentType(), d.getDocumentReferenceId(), d.getFileName(), d.getSource(), d.getVerificationStatus()
        )).toList());
        resp.setHistory(history.stream().map(h -> new LoanHistoryResponse(
                h.getPreviousStatus(), h.getNewStatus(), h.getChangedBy(), h.getChangedByRole(),
                h.getChangedAt(), h.getRemarks(), h.getReason()
        )).toList());
        resp.setCreatedAt(app.getCreatedAt());
        resp.setUpdatedAt(app.getUpdatedAt());
        return resp;
    }
}
