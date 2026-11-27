package com.fintech.investment.service;

import com.fintech.investment.calculator.*;
import com.fintech.investment.calculator.CalculationDtos.*;
import com.fintech.investment.client.AccountServiceClient;
import com.fintech.investment.client.CustomerServiceClient;
import com.fintech.investment.client.LedgerServiceClient;
import com.fintech.investment.client.PaymentServiceClient;
import com.fintech.investment.client.dto.ExternalDtos.*;
import com.fintech.investment.config.SecurityUtils;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.dto.InvestmentDtos.*;
import com.fintech.investment.entity.*;
import com.fintech.investment.entity.InvestmentEnums.*;
import com.fintech.investment.event.InvestmentOutboxService;
import com.fintech.investment.exception.ApiException;
import com.fintech.investment.repository.*;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InvestmentApplicationService {

    private final InvestmentProductService productService;
    private final InvestmentApplicationRepository applicationRepository;
    private final InvestmentRepository investmentRepository;
    private final InvestmentConsentRepository consentRepository;
    private final InvestmentTransactionRepository transactionRepository;
    private final InvestmentInstallmentScheduleRepository scheduleRepository;
    private final InvestmentDocumentRepository documentRepository;
    private final InvestmentIdempotencyService idempotencyService;
    private final InvestmentOutboxService outboxService;
    private final CustomerServiceClient customerClient;
    private final AccountServiceClient accountClient;
    private final LedgerServiceClient ledgerClient;
    private final PaymentServiceClient paymentClient;
    private final FdCalculator fdCalculator;
    private final RdCalculator rdCalculator;
    private final SipCalculator sipCalculator;
    private final SsyCalculator ssyCalculator;
    private final TransactionTemplate transactionTemplate;

    private final int ssyMaxGirlChildAge;
    private final int ssyMaxAccountsPerFamily;

    public InvestmentApplicationService(
            InvestmentProductService productService,
            InvestmentApplicationRepository applicationRepository,
            InvestmentRepository investmentRepository,
            InvestmentConsentRepository consentRepository,
            InvestmentTransactionRepository transactionRepository,
            InvestmentInstallmentScheduleRepository scheduleRepository,
            InvestmentDocumentRepository documentRepository,
            InvestmentIdempotencyService idempotencyService,
            InvestmentOutboxService outboxService,
            CustomerServiceClient customerClient,
            AccountServiceClient accountClient,
            LedgerServiceClient ledgerClient,
            PaymentServiceClient paymentClient,
            FdCalculator fdCalculator,
            RdCalculator rdCalculator,
            SipCalculator sipCalculator,
            SsyCalculator ssyCalculator,
            TransactionTemplate transactionTemplate,
            @Value("${app.investment.ssy-max-girl-child-age-years:10}") int ssyMaxGirlChildAge,
            @Value("${app.investment.ssy-max-accounts-per-family:2}") int ssyMaxAccountsPerFamily) {
        this.productService = productService;
        this.applicationRepository = applicationRepository;
        this.investmentRepository = investmentRepository;
        this.consentRepository = consentRepository;
        this.transactionRepository = transactionRepository;
        this.scheduleRepository = scheduleRepository;
        this.documentRepository = documentRepository;
        this.idempotencyService = idempotencyService;
        this.outboxService = outboxService;
        this.customerClient = customerClient;
        this.accountClient = accountClient;
        this.ledgerClient = ledgerClient;
        this.paymentClient = paymentClient;
        this.fdCalculator = fdCalculator;
        this.rdCalculator = rdCalculator;
        this.sipCalculator = sipCalculator;
        this.ssyCalculator = ssyCalculator;
        this.transactionTemplate = transactionTemplate;
        this.ssyMaxGirlChildAge = ssyMaxGirlChildAge;
        this.ssyMaxAccountsPerFamily = ssyMaxAccountsPerFamily;
    }

    public ApplicationResponse submitApplication(CreateApplicationRequest req, String idempotencyKey) {
        String subject = SecurityUtils.getAuthenticatedSubject();
        var cached = idempotencyService.checkReplay(
                idempotencyKey, "INVESTMENT_APPLY", subject, req, ApplicationResponse.class);
        if (cached.isPresent()) {
            return cached.get();
        }

        // External checks BEFORE opening DB transaction
        CustomerProfileDto customer = customerClient.getCurrentCustomerProfile();
        if (!"VERIFIED".equalsIgnoreCase(customer.kycStatus()) && !"APPROVED".equalsIgnoreCase(customer.kycStatus())) {
            throw ApiException.unprocessable("KYC_NOT_VERIFIED",
                    "Customer KYC must be VERIFIED before opening an investment (current: " + customer.kycStatus() + ").");
        }
        InternalAccountDto account = accountClient.validateActiveOwnedAccount(req.fundingAccountId(), subject);
        LedgerBalanceDto balance = ledgerClient.getAccountBalance(req.fundingAccountId());
        if (balance.availableBalance().compareTo(req.amount()) < 0) {
            throw ApiException.unprocessable("INSUFFICIENT_BALANCE",
                    "Insufficient available balance in funding account. Available: " + balance.availableBalance());
        }

        InvestmentProduct product = productService.findActiveByCodeOrThrow(req.productCode());
        validateProductRules(product, req, subject);

        ApplicationResponse response = transactionTemplate.execute(status ->
                persistAndMaybeBook(req, subject, customer, account, product, idempotencyKey));
        idempotencyService.recordSuccess(idempotencyKey, "INVESTMENT_APPLY", subject, req, response, 201);
        return response;
    }

    protected ApplicationResponse persistAndMaybeBook(
            CreateApplicationRequest req,
            String subject,
            CustomerProfileDto customer,
            InternalAccountDto account,
            InvestmentProduct product,
            String idempotencyKey) {

        LocalDate today = LocalDate.now();
        int tenureMonths = resolveTenureMonths(product, req);
        int tenureDays = (req.tenureDays() != null && req.tenureDays() > 0)
                ? req.tenureDays()
                : (int) ChronoUnit.DAYS.between(today, today.plusMonths(tenureMonths));

        BigDecimal rate = productService.resolveApplicableRate(product, tenureDays, req.amount(), today);
        CompoundingFrequency compFreq = req.compoundingFrequency() != null
                ? req.compoundingFrequency()
                : CompoundingFrequency.valueOf(product.getCompoundingFrequency());
        PayoutFrequency payFreq = req.payoutFrequency() != null
                ? req.payoutFrequency()
                : PayoutFrequency.MATURITY;

        BigDecimal projectedMaturity;
        BigDecimal projectedInterest;
        if (product.getProductType() == ProductType.FD) {
            FdCalculationResult calc = fdCalculator.calculate(
                    req.amount(), rate, today, tenureMonths, req.tenureDays(), compFreq, payFreq, product.getMaxLtvPct());
            projectedMaturity = calc.maturityValue();
            projectedInterest = calc.interestEarned();
        } else if (product.getProductType() == ProductType.RD) {
            RdCalculationResult calc = rdCalculator.calculate(req.amount(), tenureMonths, rate, today);
            projectedMaturity = calc.maturityValue();
            projectedInterest = calc.interestEarned();
        } else if (product.getProductType() == ProductType.SIP) {
            BigDecimal assumed = req.sipAssumedReturnPct() != null ? req.sipAssumedReturnPct() : product.getBaseRate();
            rate = assumed;
            SipCalculationResult calc = sipCalculator.calculateIllustrative(req.amount(), tenureMonths, assumed);
            projectedMaturity = calc.projectedValue();
            projectedInterest = calc.projectedGain();
        } else {
            SsyCalculationResult calc = ssyCalculator.calculate(req.amount(), rate, 15, 21, today);
            projectedMaturity = calc.maturityValue();
            projectedInterest = calc.interestEarned();
        }

        String appId = "INVAPP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        InvestmentApplication app = new InvestmentApplication();
        app.setApplicationId(appId);
        app.setIdentitySubject(subject);
        app.setCustomerId(customer.customerId());
        app.setProductId(product.getId());
        app.setProductCode(product.getProductCode());
        app.setProductType(product.getProductType());
        app.setProductVersion(product.getActiveVersion());
        app.setStatus(ApplicationStatus.SUBMITTED);
        app.setCurrency(product.getCurrency());
        app.setRequestedAmount(req.amount());
        app.setMonthlyAmount(
                (product.getProductType() == ProductType.RD || product.getProductType() == ProductType.SIP)
                        ? req.amount() : null);
        app.setTenureMonths(tenureMonths);
        app.setTenureDays(tenureDays);
        app.setAppliedRate(rate);
        app.setProjectedMaturityAmount(projectedMaturity);
        app.setProjectedInterest(projectedInterest);
        app.setCompoundingFrequency(compFreq.name());
        app.setPayoutFrequency(payFreq.name());
        app.setAutoRenewal(Boolean.TRUE.equals(req.autoRenewal()) && product.isAutoRenewalSupported());
        app.setFundingAccountId(account.accountId());
        app.setFundingAccountMasked(account.accountNumberMasked());
        app.setNomineeName(req.nomineeName());
        app.setNomineeRelationship(req.nomineeRelationship());
        app.setNomineeDob(req.nomineeDob());
        app.setSipFundCategory(req.sipFundCategory() != null ? req.sipFundCategory().name() : product.getFundCategory());
        app.setSipDebitDay(req.sipDebitDay());
        app.setSsyGirlChildName(req.ssyGirlChildName());
        app.setSsyGirlChildDob(req.ssyGirlChildDob());
        app.setSsyGuardianName(req.ssyGuardianName());
        app.setSsyGuardianRelationship(req.ssyGuardianRelationship());
        app.setSsyFamilyException(Boolean.TRUE.equals(req.ssyFamilyException()));
        app.setKycStatusAtApply(customer.kycStatus());
        app = applicationRepository.save(app);

        InvestmentConsent consent = new InvestmentConsent();
        consent.setApplicationId(appId);
        consent.setIdentitySubject(subject);
        consent.setConsentType(product.getProductType().name() + "_TERMS_AND_RISK_DISCLOSURE");
        consent.setDisclosureVersion(req.disclosureVersion() != null ? req.disclosureVersion() : "v1.0");
        consent.setAccepted(Boolean.TRUE.equals(req.consentAccepted()));
        consentRepository.save(consent);

        outboxService.enqueueNotification(
                subject,
                "INVESTMENT_APPLICATION_INITIATED",
                appId,
                product.getProductName() + " Application Initiated",
                "Your application " + appId + " for " + product.getProductName() + " has been initiated.",
                "INVESTMENT",
                "NORMAL",
                "CUSTOMER",
                Map.of("applicationId", appId, "productCode", product.getProductCode(), "productType", product.getProductType().name())
        );

        // SSY or family-exception applications require document/staff verification; FD/RD/SIP can book immediately if requested
        if (Boolean.TRUE.equals(req.immediateBook()) && product.getProductType() != ProductType.SSY) {
            bookInvestmentInternal(app, product, idempotencyKey != null ? idempotencyKey : appId);
        }

        return toApplicationResponse(app);
    }

    @Transactional
    public InvestmentResponse approveAndBookByStaff(String applicationId, StaffDecisionRequest decision) {
        InvestmentApplication app = applicationRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> ApiException.notFound("APPLICATION_NOT_FOUND", "Application not found: " + applicationId));
        if (app.getStatus() == ApplicationStatus.BOOKED || app.getStatus() == ApplicationStatus.REJECTED) {
            throw ApiException.conflict("INVALID_APPLICATION_STATE", "Application is already " + app.getStatus());
        }
        InvestmentProduct product = productService.findActiveByCodeOrThrow(app.getProductCode());
        app.setReviewedBy(SecurityUtils.getAuthenticatedSubject());
        app.setReviewedAt(Instant.now());
        app.setRemarks(decision != null ? decision.remarks() : "Approved by staff");
        app.setStatus(ApplicationStatus.APPROVED);

        outboxService.enqueueNotification(
                app.getIdentitySubject(),
                "INVESTMENT_APPLICATION_APPROVED",
                app.getApplicationId(),
                "Investment Application Approved",
                "Your investment application " + app.getApplicationId() + " has been approved.",
                "INVESTMENT",
                "HIGH",
                "CUSTOMER",
                Map.of("applicationId", app.getApplicationId())
        );

        Investment booked = bookInvestmentInternal(app, product, "BOOK-" + app.getApplicationId());
        return toInvestmentResponse(booked, product);
    }

    @Transactional
    public ApplicationResponse rejectApplication(String applicationId, StaffDecisionRequest decision) {
        InvestmentApplication app = applicationRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> ApiException.notFound("APPLICATION_NOT_FOUND", "Application not found: " + applicationId));
        if (app.getStatus() == ApplicationStatus.BOOKED) {
            throw ApiException.conflict("ALREADY_BOOKED", "Cannot reject an already booked application.");
        }
        app.setStatus(ApplicationStatus.REJECTED);
        app.setReviewedBy(SecurityUtils.getAuthenticatedSubject());
        app.setReviewedAt(Instant.now());
        app.setRejectionReason(decision != null ? decision.rejectionReason() : "Rejected during review");
        app.setRemarks(decision != null ? decision.remarks() : null);
        app = applicationRepository.save(app);

        outboxService.enqueueNotification(
                app.getIdentitySubject(),
                "INVESTMENT_APPLICATION_REJECTED",
                app.getApplicationId(),
                "Investment Application Rejected",
                "Your investment application " + app.getApplicationId() + " was rejected: " + app.getRejectionReason(),
                "INVESTMENT",
                "HIGH",
                "CUSTOMER",
                Map.of("applicationId", app.getApplicationId())
        );
        return toApplicationResponse(app);
    }

    @Transactional
    public DocumentResponse attachDocument(String applicationId, DocumentUploadRequest req) {
        String subject = SecurityUtils.getAuthenticatedSubject();
        InvestmentApplication app = applicationRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> ApiException.notFound("APPLICATION_NOT_FOUND", "Application not found: " + applicationId));
        if (!app.getIdentitySubject().equals(subject) && !SecurityUtils.isStaffRole()) {
            throw ApiException.forbidden("FORBIDDEN", "You do not own this application.");
        }
        String sanitizedFileName = req.fileName().replaceAll("[^a-zA-Z0-9._-]", "_");
        if (!List.of("application/pdf", "image/png", "image/jpeg").contains(req.contentType().toLowerCase())) {
            throw ApiException.badRequest("UNSUPPORTED_FILE_TYPE", "Only PDF, PNG, and JPEG documents are allowed.");
        }

        InvestmentDocument doc = new InvestmentDocument();
        doc.setDocumentId("INVDOC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        doc.setApplicationId(applicationId);
        doc.setIdentitySubject(app.getIdentitySubject());
        doc.setDocumentType(req.documentType());
        doc.setFileName(sanitizedFileName);
        doc.setContentType(req.contentType());
        doc.setFileSizeBytes(req.fileSizeBytes());
        doc.setStorageRef("vault://investments/" + applicationId + "/" + sanitizedFileName);
        doc.setChecksumSha256(req.checksumSha256());
        doc.setVerificationStatus("PENDING");
        doc = documentRepository.save(doc);

        if (app.getStatus() == ApplicationStatus.SUBMITTED) {
            app.setStatus(ApplicationStatus.DOCUMENT_VERIFICATION);
            applicationRepository.save(app);
        }
        return toDocumentResponse(doc);
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getMyApplications() {
        String subject = SecurityUtils.getAuthenticatedSubject();
        return applicationRepository.findByIdentitySubjectOrderByCreatedAtDesc(subject).stream()
                .map(this::toApplicationResponse)
                .toList();
    }

    private Investment bookInvestmentInternal(InvestmentApplication app, InvestmentProduct product, String idempotencyKey) {
        String invId = "INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String txId = "INVTX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String correlationId = MDC.get(InvestmentConstants.MDC_CORRELATION_ID);

        InvestmentTransaction tx = new InvestmentTransaction();
        tx.setTransactionId(txId);
        tx.setInvestmentId(invId);
        tx.setIdentitySubject(app.getIdentitySubject());
        tx.setTransactionType(TransactionType.BOOKING_DEBIT);
        tx.setDirection(TransactionDirection.DEBIT);
        tx.setAmount(app.getRequestedAmount());
        tx.setCurrency(app.getCurrency());
        tx.setStatus(TransactionStatus.INITIATED);
        tx.setAccountId(app.getFundingAccountId());
        tx.setIdempotencyKey(idempotencyKey);
        tx.setCorrelationId(correlationId);
        tx.setRemarks("Initial booking debit for " + product.getProductCode());
        transactionRepository.save(tx);

        MultiLinePostingRequest posting = new MultiLinePostingRequest(
                "TRANSFER",
                app.getCurrency(),
                correlationId,
                "Investment booking debit " + invId,
                txId,
                List.of(
                        new PostingEntryRequest(
                                app.getFundingAccountId(),
                                "DEBIT",
                                app.getRequestedAmount(),
                                "Investment booking " + product.getProductCode(),
                                txId
                        ),
                        new PostingEntryRequest(
                                InvestmentConstants.SYSTEM_INVESTMENT_SETTLEMENT_ACCOUNT,
                                "CREDIT",
                                app.getRequestedAmount(),
                                "Investment settlement pool credit " + invId,
                                txId
                        )
                )
        );

        try {
            LedgerPostingResponseDto ledgerRes = ledgerClient.postBatch("LEDGER-" + txId, posting);
            tx.setStatus(TransactionStatus.COMPLETED);
            tx.setLedgerTransactionId(ledgerRes.transactionId());
            tx.setCompletedAt(Instant.now());
            transactionRepository.save(tx);
        } catch (RuntimeException ex) {
            tx.setStatus(TransactionStatus.FAILED);
            tx.setRemarks("Ledger debit failed: " + ex.getMessage());
            transactionRepository.save(tx);
            throw ex;
        }

        LocalDate start = LocalDate.now();
        LocalDate maturityDate;
        if (product.getProductType() == ProductType.SSY) {
            maturityDate = start.plusYears(21);
        } else if (product.getProductType() == ProductType.FD && app.getTenureDays() != null && app.getTenureDays() > 0) {
            maturityDate = start.plusDays(app.getTenureDays());
        } else {
            maturityDate = start.plusMonths(app.getTenureMonths());
        }

        Investment inv = new Investment();
        inv.setInvestmentId(invId);
        inv.setApplicationId(app.getApplicationId());
        inv.setIdentitySubject(app.getIdentitySubject());
        inv.setCustomerId(app.getCustomerId());
        inv.setProductId(product.getId());
        inv.setProductCode(product.getProductCode());
        inv.setProductType(product.getProductType());
        inv.setStatus(InvestmentStatus.ACTIVE);
        inv.setCurrency(app.getCurrency());
        inv.setPrincipalAmount(app.getRequestedAmount());
        inv.setMonthlyAmount(app.getMonthlyAmount());
        inv.setTotalInvested(app.getRequestedAmount());
        inv.setInterestRate(app.getAppliedRate());
        inv.setRateLockedAt(Instant.now());
        inv.setCompoundingFrequency(app.getCompoundingFrequency());
        inv.setPayoutFrequency(app.getPayoutFrequency());
        inv.setTenureMonths(app.getTenureMonths());
        inv.setTenureDays(app.getTenureDays());
        inv.setStartDate(start);
        inv.setMaturityDate(maturityDate);
        inv.setMaturityAmount(app.getProjectedMaturityAmount());
        inv.setProjectedGain(app.getProjectedInterest());
        inv.setFundingAccountId(app.getFundingAccountId());
        inv.setFundingAccountMasked(app.getFundingAccountMasked());
        inv.setAutoRenewal(app.isAutoRenewal());
        inv.setSipFundCategory(app.getSipFundCategory());
        inv.setSipDebitDay(app.getSipDebitDay());
        inv.setSsyGirlChildName(app.getSsyGirlChildName());
        inv.setSsyGirlChildDob(app.getSsyGirlChildDob());
        inv.setSsyGuardianName(app.getSsyGuardianName());
        inv.setSsyGuardianRelationship(app.getSsyGuardianRelationship());
        if (product.getProductType() == ProductType.SSY) {
            inv.setSsyDepositEndDate(start.plusYears(15));
        }
        inv.setCertificateNumber("CERT-" + invId);
        inv = investmentRepository.save(inv);

        app.setStatus(ApplicationStatus.BOOKED);
        applicationRepository.save(app);

        generateInstallmentScheduleIfRecurring(inv, txId);

        if (product.getProductType() == ProductType.RD || product.getProductType() == ProductType.SIP) {
            paymentClient.registerMandateBestEffort("MND-" + invId, new RegisterMandateRequest(
                    "investment-service",
                    "MND-" + invId,
                    app.getCustomerId(),
                    "NACH",
                    app.getRequestedAmount(),
                    "MONTHLY",
                    start.plusMonths(1),
                    maturityDate
            ));
        }

        outboxService.enqueueNotification(
                inv.getIdentitySubject(),
                "INVESTMENT_BOOKED",
                inv.getInvestmentId(),
                product.getProductName() + " Successfully Booked",
                "Your " + product.getProductName() + " (" + inv.getInvestmentId() + ") is now ACTIVE.",
                "INVESTMENT",
                "HIGH",
                "CUSTOMER",
                Map.of("investmentId", inv.getInvestmentId(), "productType", inv.getProductType().name())
        );
        outboxService.enqueueLifecycleEvent(inv.getIdentitySubject(), "InvestmentBookedEvent", inv.getInvestmentId(),
                Map.of("investmentId", inv.getInvestmentId(), "productCode", inv.getProductCode(), "amount", inv.getPrincipalAmount()));

        return inv;
    }

    private void generateInstallmentScheduleIfRecurring(Investment inv, String firstTxId) {
        if (inv.getProductType() != ProductType.RD && inv.getProductType() != ProductType.SIP) {
            return;
        }
        List<InvestmentInstallmentSchedule> schedules = new ArrayList<>();
        LocalDate base = inv.getStartDate();
        int debitDay = inv.getSipDebitDay() != null ? inv.getSipDebitDay() : base.getDayOfMonth();
        for (int i = 1; i <= inv.getTenureMonths(); i++) {
            InvestmentInstallmentSchedule s = new InvestmentInstallmentSchedule();
            s.setScheduleId("SCH-" + inv.getInvestmentId() + "-" + i);
            s.setInvestmentId(inv.getInvestmentId());
            s.setInstallmentNumber(i);
            LocalDate due = base.plusMonths(i - 1L);
            int safeDay = Math.min(debitDay, due.lengthOfMonth());
            s.setDueDate(i == 1 ? base : due.withDayOfMonth(safeDay));
            s.setAmount(inv.getMonthlyAmount());
            if (i == 1) {
                s.setStatus(InstallmentStatus.PAID);
                s.setPaidAmount(inv.getMonthlyAmount());
                s.setPaidAt(Instant.now());
                s.setTransactionRef(firstTxId);
            } else {
                s.setStatus(InstallmentStatus.PENDING);
            }
            schedules.add(s);
        }
        scheduleRepository.saveAll(schedules);
    }

    private void validateProductRules(InvestmentProduct product, CreateApplicationRequest req, String subject) {
        if (req.amount().compareTo(product.getMinAmount()) < 0 || req.amount().compareTo(product.getMaxAmount()) > 0) {
            throw ApiException.badRequest("AMOUNT_OUT_OF_RANGE",
                    "Amount must be between " + product.getMinAmount() + " and " + product.getMaxAmount());
        }
        if (product.getDenominationStep().compareTo(BigDecimal.ONE) > 0) {
            BigDecimal remainder = req.amount().remainder(product.getDenominationStep());
            if (remainder.compareTo(BigDecimal.ZERO) != 0) {
                throw ApiException.badRequest("INVALID_DENOMINATION",
                        "Amount must be in multiples of " + product.getDenominationStep());
            }
        }
        int tenure = resolveTenureMonths(product, req);
        if (tenure < product.getMinTenureMonths() || tenure > product.getMaxTenureMonths()) {
            throw ApiException.badRequest("TENURE_OUT_OF_RANGE",
                    "Tenure must be between " + product.getMinTenureMonths() + " and " + product.getMaxTenureMonths() + " months.");
        }
        if (product.getProductType() == ProductType.SIP && req.sipDebitDay() == null) {
            throw ApiException.badRequest("SIP_DEBIT_DAY_REQUIRED", "Monthly debit day (1-28) is required for SIP.");
        }
        if (product.getProductType() == ProductType.SSY) {
            validateSsyRules(req, subject);
        }
    }

    private void validateSsyRules(CreateApplicationRequest req, String subject) {
        if (req.ssyGirlChildName() == null || req.ssyGirlChildName().isBlank()
                || req.ssyGirlChildDob() == null
                || req.ssyGuardianName() == null || req.ssyGuardianName().isBlank()
                || req.ssyGuardianRelationship() == null || req.ssyGuardianRelationship().isBlank()) {
            throw ApiException.badRequest("SSY_DETAILS_REQUIRED",
                    "Girl child name, DOB, guardian name, and guardian relationship are mandatory for SSY.");
        }
        int age = Period.between(req.ssyGirlChildDob(), LocalDate.now()).getYears();
        if (age < 0 || age >= ssyMaxGirlChildAge) {
            throw ApiException.unprocessable("SSY_AGE_INELIGIBLE",
                    "Girl child must be below " + ssyMaxGirlChildAge + " years of age at SSY account opening.");
        }
        boolean duplicateChild = investmentRepository
                .existsByIdentitySubjectAndProductTypeAndSsyGirlChildNameIgnoreCaseAndSsyGirlChildDobAndStatusIn(
                        subject, ProductType.SSY, req.ssyGirlChildName().trim(), req.ssyGirlChildDob(),
                        List.of(InvestmentStatus.ACTIVE, InvestmentStatus.PAUSED));
        if (duplicateChild) {
            throw ApiException.conflict("SSY_DUPLICATE_CHILD", "Only one SSY account is permitted per girl child.");
        }
        long activeCount = investmentRepository.countByIdentitySubjectAndProductTypeAndStatusIn(
                subject, ProductType.SSY, List.of(InvestmentStatus.ACTIVE, InvestmentStatus.PAUSED));
        long pendingCount = applicationRepository.countByIdentitySubjectAndProductTypeAndStatusIn(
                subject, ProductType.SSY, List.of(ApplicationStatus.SUBMITTED, ApplicationStatus.DOCUMENT_VERIFICATION, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED));
        if ((activeCount + pendingCount) >= ssyMaxAccountsPerFamily && !Boolean.TRUE.equals(req.ssyFamilyException())) {
            throw ApiException.unprocessable("SSY_FAMILY_LIMIT_EXCEEDED",
                    "Maximum " + ssyMaxAccountsPerFamily + " girl-child SSY accounts allowed per family unless exception applies.");
        }
    }

    private int resolveTenureMonths(InvestmentProduct product, CreateApplicationRequest req) {
        if (product.getProductType() == ProductType.SSY) {
            return 252; // 21 years
        }
        if (req.tenureMonths() == null) {
            throw ApiException.badRequest("TENURE_REQUIRED", "Tenure in months is required.");
        }
        return req.tenureMonths();
    }

    public ApplicationResponse toApplicationResponse(InvestmentApplication a) {
        return new ApplicationResponse(
                a.getApplicationId(), a.getIdentitySubject(), a.getCustomerId(), a.getProductCode(),
                a.getProductType(), a.getStatus(), a.getCurrency(), a.getRequestedAmount(), a.getMonthlyAmount(),
                a.getTenureMonths(), a.getTenureDays(), a.getAppliedRate(), a.getProjectedMaturityAmount(),
                a.getProjectedInterest(), a.getPayoutFrequency(), a.isAutoRenewal(), a.getFundingAccountId(),
                a.getFundingAccountMasked(), a.getSipFundCategory(), a.getSipDebitDay(), a.getSsyGirlChildName(),
                a.getSsyGirlChildDob(), a.getSsyGuardianName(), a.getKycStatusAtApply(), a.getRemarks(),
                a.getRejectionReason(), a.getCreatedAt(), a.getUpdatedAt()
        );
    }

    public InvestmentResponse toInvestmentResponse(Investment i, InvestmentProduct p) {
        boolean guaranteed = p != null ? p.isReturnsGuaranteed() : (i.getProductType() == ProductType.FD || i.getProductType() == ProductType.RD);
        boolean marketLinked = p != null ? p.isMarketLinked() : (i.getProductType() == ProductType.SIP);
        boolean govScheme = p != null ? p.isGovernmentScheme() : (i.getProductType() == ProductType.SSY);
        String disclosure = switch (i.getProductType()) {
            case FD, RD -> "Guaranteed contractual return at locked rate.";
            case SIP -> SipCalculator.SIP_DISCLAIMER;
            case SSY -> SsyCalculator.SSY_DISCLAIMER;
        };
        BigDecimal maxLoanEligible = (i.getProductType() == ProductType.FD && p != null && p.isLoanAgainstFdAllowed())
                ? i.getPrincipalAmount().multiply(p.getMaxLtvPct()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new InvestmentResponse(
                i.getInvestmentId(), i.getApplicationId(), i.getIdentitySubject(), i.getCustomerId(),
                i.getProductCode(), i.getProductType(), i.getStatus(), i.getCurrency(), i.getPrincipalAmount(),
                i.getMonthlyAmount(), i.getTotalInvested(), i.getInterestRate(), i.getRateLockedAt(),
                i.getCompoundingFrequency(), i.getPayoutFrequency(), i.getTenureMonths(), i.getTenureDays(),
                i.getStartDate(), i.getMaturityDate(), i.getMaturityAmount(), i.getAccruedInterest(),
                i.getProjectedGain(), guaranteed, marketLinked, govScheme, disclosure,
                i.getFundingAccountId(), i.getFundingAccountMasked(), i.isAutoRenewal(), i.getMaturityInstruction(),
                i.isLoanAgainstFdActive(), maxLoanEligible, i.getSipFundCategory(), i.getSipDebitDay(),
                i.getSsyGirlChildName(), i.getSsyDepositEndDate(), i.getCertificateNumber(), i.getCreatedAt()
        );
    }

    public DocumentResponse toDocumentResponse(InvestmentDocument d) {
        return new DocumentResponse(
                d.getDocumentId(), d.getApplicationId(), d.getDocumentType(), d.getFileName(),
                d.getContentType(), d.getFileSizeBytes(), d.getVerificationStatus(), d.getVerifiedBy(),
                d.getVerifiedAt(), d.getCreatedAt()
        );
    }
}
