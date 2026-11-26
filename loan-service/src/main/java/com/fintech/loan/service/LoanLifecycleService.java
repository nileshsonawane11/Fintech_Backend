package com.fintech.loan.service;

import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.LoanLifecycleRequests.*;
import com.fintech.loan.dto.response.LoanApplicationResponse;
import com.fintech.loan.dto.response.LoanLifecycleResponses.LoanDisbursementResponse;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.LoanApplicationStatus;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Enforces the Loan Application Lifecycle state machine, role authority checks,
 * audit history persistence, disbursement creation, and Kafka + Notification dispatch.
 */
@Service
public class LoanLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(LoanLifecycleService.class);

    private static final Map<LoanApplicationStatus, Set<LoanApplicationStatus>> ALLOWED_TRANSITIONS = Map.ofEntries(
            Map.entry(LoanApplicationStatus.SUBMITTED, Set.of(
                    LoanApplicationStatus.UNDER_REVIEW,
                    LoanApplicationStatus.CANCELLED
            )),
            Map.entry(LoanApplicationStatus.UNDER_REVIEW, Set.of(
                    LoanApplicationStatus.DOCUMENT_VERIFICATION,
                    LoanApplicationStatus.ADDITIONAL_INFORMATION_REQUIRED,
                    LoanApplicationStatus.APPROVED,
                    LoanApplicationStatus.REJECTED,
                    LoanApplicationStatus.CANCELLED
            )),
            Map.entry(LoanApplicationStatus.DOCUMENT_VERIFICATION, Set.of(
                    LoanApplicationStatus.UNDER_REVIEW,
                    LoanApplicationStatus.ADDITIONAL_INFORMATION_REQUIRED,
                    LoanApplicationStatus.APPROVED,
                    LoanApplicationStatus.REJECTED,
                    LoanApplicationStatus.CANCELLED
            )),
            Map.entry(LoanApplicationStatus.ADDITIONAL_INFORMATION_REQUIRED, Set.of(
                    LoanApplicationStatus.UNDER_REVIEW,
                    LoanApplicationStatus.DOCUMENT_VERIFICATION,
                    LoanApplicationStatus.CANCELLED,
                    LoanApplicationStatus.EXPIRED
            )),
            Map.entry(LoanApplicationStatus.APPROVED, Set.of(
                    LoanApplicationStatus.OFFER_ACCEPTED,
                    LoanApplicationStatus.CANCELLED,
                    LoanApplicationStatus.EXPIRED
            )),
            Map.entry(LoanApplicationStatus.OFFER_ACCEPTED, Set.of(
                    LoanApplicationStatus.DISBURSEMENT_PENDING,
                    LoanApplicationStatus.CANCELLED
            )),
            Map.entry(LoanApplicationStatus.DISBURSEMENT_PENDING, Set.of(
                    LoanApplicationStatus.DISBURSED,
                    LoanApplicationStatus.REJECTED
            )),
            Map.entry(LoanApplicationStatus.DISBURSED, Set.of()),
            Map.entry(LoanApplicationStatus.REJECTED, Set.of()),
            Map.entry(LoanApplicationStatus.CANCELLED, Set.of()),
            Map.entry(LoanApplicationStatus.EXPIRED, Set.of())
    );

    private final LoanApplicationRepository applicationRepository;
    private final LoanApplicationHistoryRepository historyRepository;
    private final LoanOfferRepository sanctionedOfferRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final LoanProductService productService;
    private final RepaymentScheduleService repaymentScheduleService;
    private final LoanFinancialCalculator calculator;
    private final AccountServiceClient accountServiceClient;
    private final LoanApplicationService applicationService;
    private final LoanOutboxService outboxService;
    private final LoanNotificationService notificationService;
    private final BigDecimal managerApprovalLimit;
    private final int offerExpiryDays;
    private final String statusChangedTopic;
    private final String approvedTopic;
    private final String rejectedTopic;
    private final String disbursedTopic;

    public LoanLifecycleService(
            LoanApplicationRepository applicationRepository,
            LoanApplicationHistoryRepository historyRepository,
            LoanOfferRepository sanctionedOfferRepository,
            LoanAccountRepository loanAccountRepository,
            LoanProductService productService,
            RepaymentScheduleService repaymentScheduleService,
            LoanFinancialCalculator calculator,
            AccountServiceClient accountServiceClient,
            LoanApplicationService applicationService,
            LoanOutboxService outboxService,
            LoanNotificationService notificationService,
            @Value("${app.loan.manager-approval-limit:10000000.00}") BigDecimal managerApprovalLimit,
            @Value("${app.loan.offer-expiry-days:" + LoanConstants.DEFAULT_OFFER_EXPIRY_DAYS + "}") int offerExpiryDays,
            @Value("${app.kafka.topics.application-status-changed:" + LoanConstants.TOPIC_APPLICATION_STATUS_CHANGED + "}") String statusChangedTopic,
            @Value("${app.kafka.topics.application-approved:" + LoanConstants.TOPIC_APPLICATION_APPROVED + "}") String approvedTopic,
            @Value("${app.kafka.topics.application-rejected:" + LoanConstants.TOPIC_APPLICATION_REJECTED + "}") String rejectedTopic,
            @Value("${app.kafka.topics.application-disbursed:" + LoanConstants.TOPIC_APPLICATION_DISBURSED + "}") String disbursedTopic) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
        this.sanctionedOfferRepository = sanctionedOfferRepository;
        this.loanAccountRepository = loanAccountRepository;
        this.productService = productService;
        this.repaymentScheduleService = repaymentScheduleService;
        this.calculator = calculator;
        this.accountServiceClient = accountServiceClient;
        this.applicationService = applicationService;
        this.outboxService = outboxService;
        this.notificationService = notificationService;
        this.managerApprovalLimit = managerApprovalLimit;
        this.offerExpiryDays = offerExpiryDays;
        this.statusChangedTopic = statusChangedTopic;
        this.approvedTopic = approvedTopic;
        this.rejectedTopic = rejectedTopic;
        this.disbursedTopic = disbursedTopic;
    }

    @Transactional
    public LoanApplicationResponse assignOfficer(String applicationId, AssignOfficerRequest request,
                                                   String actorId, String actorRole) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        app.setAssignedOfficerId(request.officerId().trim());
        app.setAssignedOfficerName(request.officerName() != null ? request.officerName().trim() : request.officerId().trim());

        LoanApplicationStatus current = parseStatus(app.getStatus());
        if (current == LoanApplicationStatus.SUBMITTED) {
            transitionStatus(app, LoanApplicationStatus.UNDER_REVIEW, actorId, actorRole,
                    request.remarks() != null ? request.remarks() : "Assigned to loan officer " + app.getAssignedOfficerId(),
                    "OFFICER_ASSIGNED");
        } else {
            applicationRepository.save(app);
        }

        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_OFFICER,
                app.getAssignedOfficerId(),
                "LOAN_APPLICATION_ASSIGNED",
                "Loan Application Assigned: " + app.getLoanApplicationId(),
                "Loan application " + app.getLoanApplicationId() + " has been assigned to you for underwriting review.",
                app.getLoanApplicationId()
        );
        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanApplicationResponse moveToUnderReview(String applicationId, TransitionApplicationRequest request,
                                                     String actorId, String actorRole) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        if (app.getAssignedOfficerId() == null) {
            app.setAssignedOfficerId(actorId);
        }
        app.setCreditAssessmentStatus("IN_PROGRESS");
        transitionStatus(app, LoanApplicationStatus.UNDER_REVIEW, actorId, actorRole,
                request != null ? request.remarks() : "Moved to underwriting review",
                request != null && request.reason() != null ? request.reason() : "REVIEW_STARTED");

        notificationService.notifyCustomer(
                customerRecipient(app),
                "LOAN_UNDER_REVIEW",
                "Application Under Review: " + app.getLoanApplicationId(),
                "Your loan application " + app.getLoanApplicationId() + " is now under review by our credit team.",
                app.getLoanApplicationId()
        );
        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_MANAGER, null,
                "LOAN_IN_REVIEW",
                "Loan Application Under Review: " + app.getLoanApplicationId(),
                "Application " + app.getLoanApplicationId() + " moved to UNDER_REVIEW by " + actorId + ".",
                app.getLoanApplicationId()
        );
        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanApplicationResponse moveToDocumentVerification(String applicationId, TransitionApplicationRequest request,
                                                              String actorId, String actorRole) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        transitionStatus(app, LoanApplicationStatus.DOCUMENT_VERIFICATION, actorId, actorRole,
                request != null ? request.remarks() : "Document verification started/completed",
                request != null && request.reason() != null ? request.reason() : "DOCUMENT_VERIFICATION");

        notificationService.notifyCustomer(
                customerRecipient(app),
                "LOAN_DOCUMENT_VERIFICATION",
                "Document Verification Update: " + app.getLoanApplicationId(),
                "Documents for loan application " + app.getLoanApplicationId() + " are undergoing verification.",
                app.getLoanApplicationId()
        );
        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_MANAGER, null,
                "LOAN_DOCUMENTS_VERIFIED",
                "Document Verification Stage: " + app.getLoanApplicationId(),
                "Application " + app.getLoanApplicationId() + " is in DOCUMENT_VERIFICATION.",
                app.getLoanApplicationId()
        );
        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanApplicationResponse requestAdditionalInformation(String applicationId, TransitionApplicationRequest request,
                                                                String actorId, String actorRole) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        String reason = (request != null && request.reason() != null && !request.reason().isBlank())
                ? request.reason()
                : "Additional income or collateral documentation requested.";
        transitionStatus(app, LoanApplicationStatus.ADDITIONAL_INFORMATION_REQUIRED, actorId, actorRole,
                request != null ? request.remarks() : reason, reason);

        notificationService.notifyCustomer(
                customerRecipient(app),
                "LOAN_ADDITIONAL_INFO_REQUIRED",
                "Action Required for Loan Application " + app.getLoanApplicationId(),
                "Additional information is required for your loan application " + app.getLoanApplicationId() + ": " + reason,
                app.getLoanApplicationId()
        );
        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanApplicationResponse submitAdditionalInfo(String applicationId, SubmitAdditionalInfoRequest request,
                                                        String customerSubject) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        if (!applicationService.isOwner(app, customerSubject)) {
            throw ApiException.forbidden("ACCESS_DENIED", "You do not own this loan application.");
        }
        if (request.additionalDetails() != null && !request.additionalDetails().isEmpty()) {
            Map<String, Object> merged = new LinkedHashMap<>();
            if (app.getAdditionalDetails() != null) merged.putAll(app.getAdditionalDetails());
            merged.putAll(request.additionalDetails());
            app.setAdditionalDetails(merged);
        }
        transitionStatus(app, LoanApplicationStatus.UNDER_REVIEW, customerSubject, LoanConstants.ROLE_CUSTOMER,
                request.remarks(), "ADDITIONAL_INFO_PROVIDED");

        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_OFFICER, app.getAssignedOfficerId(),
                "LOAN_ADDITIONAL_INFO_SUBMITTED",
                "Customer Submitted Additional Info: " + app.getLoanApplicationId(),
                "Customer provided requested information for " + app.getLoanApplicationId() + ".",
                app.getLoanApplicationId()
        );
        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanApplicationResponse approveApplication(String applicationId, ApproveLoanRequest request,
                                                      String actorId, String actorRole, boolean isAdmin) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        LoanProduct product = productService.findActiveProductOrThrow(app.getProductCode());

        BigDecimal approvedAmount = (request != null && request.sanctionedAmount() != null)
                ? request.sanctionedAmount() : app.getRequestedAmount();
        Integer approvedTenure = (request != null && request.tenureMonths() != null)
                ? request.tenureMonths() : app.getTenureMonths();
        BigDecimal approvedRate = (request != null && request.interestRate() != null)
                ? request.interestRate()
                : (app.getEffectiveInterestRate() != null ? app.getEffectiveInterestRate() : product.getMinimumInterestRate());

        if (approvedAmount.compareTo(product.getMinimumLoanAmount()) < 0
                || approvedAmount.compareTo(product.getMaximumLoanAmount()) > 0) {
            throw ApiException.unprocessable("APPROVED_AMOUNT_OUT_OF_RANGE",
                    "Sanctioned amount must be within product bounds.");
        }
        if (approvedTenure < product.getMinimumTenureMonths() || approvedTenure > product.getMaximumTenureMonths()) {
            throw ApiException.unprocessable("APPROVED_TENURE_OUT_OF_RANGE",
                    "Sanctioned tenure must be within product bounds.");
        }
        if (!isAdmin && approvedAmount.compareTo(managerApprovalLimit) > 0) {
            throw ApiException.forbidden("APPROVAL_AUTHORITY_EXCEEDED",
                    String.format("Loan amount %s exceeds Loan Manager approval authority (%s). ADMIN approval required.",
                            approvedAmount, managerApprovalLimit));
        }

        app.setApprovedBy(actorId);
        app.setApprovedAmount(approvedAmount);
        app.setApprovedTenureMonths(approvedTenure);
        app.setApprovedInterestRate(approvedRate);
        app.setCreditAssessmentStatus("APPROVED");

        transitionStatus(app, LoanApplicationStatus.APPROVED, actorId, actorRole,
                request != null ? request.remarks() : "Loan application approved and offer generated.",
                "CREDIT_APPROVED");

        // Create sanctioned LoanOffer for customer acceptance
        String offerId = "OFFER-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        LoanOffer sanctionedOffer = new LoanOffer();
        sanctionedOffer.setOfferId(offerId);
        sanctionedOffer.setLoanApplicationId(app.getLoanApplicationId());
        sanctionedOffer.setSanctionedAmount(approvedAmount);
        sanctionedOffer.setInterestRate(approvedRate);
        sanctionedOffer.setTenureMonths(approvedTenure);
        sanctionedOffer.setCurrency(app.getCurrency());
        sanctionedOffer.setStatus("PENDING");
        sanctionedOffer.setDisbursementAccountId(app.getDisbursementAccountId());
        sanctionedOffer.setExpiresAt(Instant.now().plus(offerExpiryDays, ChronoUnit.DAYS));
        sanctionedOfferRepository.save(sanctionedOffer);

        outboxService.enqueueEvent(
                approvedTopic,
                app.getLoanApplicationId(),
                "LOAN_APPLICATION",
                LoanConstants.EVT_APPLICATION_APPROVED,
                new LoanEvents.LoanApplicationApprovedPayload(
                        app.getLoanApplicationId(), app.getCustomerId(), app.getIdentitySubject(),
                        app.getProductCode(), offerId, approvedAmount, approvedRate, approvedTenure,
                        actorId, Instant.now()
                )
        );

        notificationService.notifyCustomer(
                customerRecipient(app),
                "LOAN_APPROVED_OFFER_AVAILABLE",
                "Loan Approved! Offer Available: " + offerId,
                "Congratulations! Your loan application " + app.getLoanApplicationId() + " has been approved for "
                        + app.getCurrency() + " " + approvedAmount + " at " + approvedRate
                        + "% p.a. Accept offer " + offerId + " to proceed with disbursement.",
                app.getLoanApplicationId()
        );
        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_OFFICER, app.getAssignedOfficerId(),
                "LOAN_APPROVED",
                "Loan Approved: " + app.getLoanApplicationId(),
                "Application " + app.getLoanApplicationId() + " was approved by " + actorId + ".",
                app.getLoanApplicationId()
        );

        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanApplicationResponse rejectApplication(String applicationId, RejectLoanRequest request,
                                                     String actorId, String actorRole) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        app.setRejectionReason(request.reason());
        app.setCreditAssessmentStatus("REJECTED");

        transitionStatus(app, LoanApplicationStatus.REJECTED, actorId, actorRole,
                request.remarks(), request.reason());

        outboxService.enqueueEvent(
                rejectedTopic,
                app.getLoanApplicationId(),
                "LOAN_APPLICATION",
                LoanConstants.EVT_APPLICATION_REJECTED,
                new LoanEvents.LoanApplicationRejectedPayload(
                        app.getLoanApplicationId(), app.getCustomerId(), app.getIdentitySubject(),
                        app.getProductCode(), request.reason(), actorId, Instant.now()
                )
        );

        notificationService.notifyCustomer(
                customerRecipient(app),
                "LOAN_REJECTED",
                "Loan Application Decision: " + app.getLoanApplicationId(),
                "Your loan application " + app.getLoanApplicationId() + " was not approved. Reason: " + request.reason(),
                app.getLoanApplicationId()
        );
        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_OFFICER, app.getAssignedOfficerId(),
                "LOAN_REJECTED",
                "Loan Application Rejected: " + app.getLoanApplicationId(),
                "Application " + app.getLoanApplicationId() + " was rejected by " + actorId + ".",
                app.getLoanApplicationId()
        );

        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanApplicationResponse cancelApplication(String applicationId, String reason,
                                                     String actorId, String actorRole, boolean isStaff) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        if (!isStaff && !applicationService.isOwner(app, actorId)) {
            throw ApiException.forbidden("ACCESS_DENIED", "You do not own this loan application.");
        }

        String effectiveReason = (reason != null && !reason.isBlank()) ? reason : "Cancelled by requester";
        transitionStatus(app, LoanApplicationStatus.CANCELLED, actorId, actorRole, effectiveReason, "CANCELLED");

        notificationService.notifyCustomer(
                customerRecipient(app),
                "LOAN_CANCELLED",
                "Loan Application Cancelled: " + app.getLoanApplicationId(),
                "Your loan application " + app.getLoanApplicationId() + " has been cancelled.",
                app.getLoanApplicationId()
        );
        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanApplicationResponse initiateDisbursement(String applicationId, String remarks,
                                                        String actorId, String actorRole) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        transitionStatus(app, LoanApplicationStatus.DISBURSEMENT_PENDING, actorId, actorRole,
                remarks != null ? remarks : "Disbursement initiated", "DISBURSEMENT_INITIATED");

        notificationService.notifyCustomer(
                customerRecipient(app),
                "LOAN_DISBURSEMENT_INITIATED",
                "Loan Disbursement Initiated: " + app.getLoanApplicationId(),
                "Disbursement for loan application " + app.getLoanApplicationId() + " has been initiated.",
                app.getLoanApplicationId()
        );
        notificationService.notifyRole(
                LoanConstants.ROLE_ADMIN, null,
                "LOAN_DISBURSEMENT_PENDING",
                "Disbursement Pending: " + app.getLoanApplicationId(),
                "Disbursement initiated for " + app.getLoanApplicationId() + " by " + actorId + ".",
                app.getLoanApplicationId()
        );
        return applicationService.toDetailResponse(app);
    }

    @Transactional
    public LoanDisbursementResponse disburseLoan(String applicationId, String remarks,
                                                 String actorId, String actorRole) {
        LoanApplication app = findApplicationOrThrow(applicationId);
        LoanApplicationStatus current = parseStatus(app.getStatus());

        if (current == LoanApplicationStatus.OFFER_ACCEPTED) {
            transitionStatus(app, LoanApplicationStatus.DISBURSEMENT_PENDING, actorId, actorRole,
                    "Disbursement initiated automatically prior to settlement", "DISBURSEMENT_INITIATED");
        }

        LoanOffer offer = sanctionedOfferRepository
                .findFirstByLoanApplicationIdOrderByCreatedAtDesc(app.getLoanApplicationId())
                .orElseThrow(() -> ApiException.unprocessable("OFFER_NOT_FOUND",
                        "No sanctioned offer found for loan application: " + applicationId));

        String targetDisbursementAccount = offer.getDisbursementAccountId() != null
                ? offer.getDisbursementAccountId()
                : app.getDisbursementAccountId();

        // Re-verify disbursement account is still ACTIVE & owned by customer before disbursing funds
        accountServiceClient.validateDisbursementAccount(
                targetDisbursementAccount,
                app.getIdentitySubject() != null ? app.getIdentitySubject() : app.getCustomerId(),
                app.getCustomerId(),
                app.getCurrency()
        );

        LoanProduct product = productService.findActiveProductOrThrow(app.getProductCode());
        BigDecimal principal = offer.getSanctionedAmount();
        BigDecimal rate = offer.getInterestRate();
        int tenure = offer.getTenureMonths();
        BigDecimal emi = calculator.calculateEmi(principal, rate, tenure, product.getInterestCalculationMethod());

        LocalDate disbursementDate = LocalDate.now();
        LocalDate nextDueDate = disbursementDate.plusMonths(1);
        Instant disbursedAt = Instant.now();

        String loanAccountId = "LN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        LoanAccount loanAccount = new LoanAccount();
        loanAccount.setLoanAccountId(loanAccountId);
        loanAccount.setLoanApplicationId(app.getLoanApplicationId());
        loanAccount.setOfferId(offer.getOfferId());
        loanAccount.setCustomerId(app.getCustomerId());
        loanAccount.setIdentitySubject(app.getIdentitySubject());
        loanAccount.setProductCode(app.getProductCode());
        loanAccount.setDisbursementAccountId(targetDisbursementAccount);
        loanAccount.setPrincipalAmount(principal);
        loanAccount.setOutstandingPrincipal(principal);
        loanAccount.setInterestRate(rate);
        loanAccount.setTenureMonths(tenure);
        loanAccount.setCurrency(app.getCurrency());
        loanAccount.setEmiAmount(emi);
        loanAccount.setDisbursementDate(disbursementDate);
        loanAccount.setNextDueDate(nextDueDate);
        loanAccount.setStatus("ACTIVE");
        loanAccountRepository.save(loanAccount);

        repaymentScheduleService.generateAndPersistSchedule(loanAccount, product.getInterestCalculationMethod());

        app.setDisbursedAt(disbursedAt);
        transitionStatus(app, LoanApplicationStatus.DISBURSED, actorId, actorRole,
                remarks != null ? remarks : "Loan disbursed to account " + targetDisbursementAccount,
                "LOAN_DISBURSED");

        outboxService.enqueueEvent(
                disbursedTopic,
                app.getLoanApplicationId(),
                "LOAN_APPLICATION",
                LoanConstants.EVT_APPLICATION_DISBURSED,
                new LoanEvents.LoanApplicationDisbursedPayload(
                        app.getLoanApplicationId(), loanAccountId, app.getCustomerId(),
                        app.getIdentitySubject(), targetDisbursementAccount, principal, rate, tenure, emi, disbursedAt
                )
        );

        notificationService.notifyCustomer(
                customerRecipient(app),
                "LOAN_DISBURSED",
                "Loan Disbursed: " + loanAccountId,
                "Your loan of " + app.getCurrency() + " " + principal + " has been disbursed to account "
                        + targetDisbursementAccount + ". Loan Account ID: " + loanAccountId + ", Monthly EMI: " + emi + ".",
                loanAccountId
        );
        notificationService.notifyRole(
                LoanConstants.ROLE_LOAN_MANAGER, null,
                "LOAN_DISBURSED",
                "Loan Disbursed: " + app.getLoanApplicationId(),
                "Loan " + loanAccountId + " (" + app.getCurrency() + " " + principal + ") disbursed by " + actorId + ".",
                loanAccountId
        );
        notificationService.notifyAdmin(
                "LOAN_DISBURSED",
                "Loan Disbursed: " + loanAccountId,
                "Loan account " + loanAccountId + " created for application " + app.getLoanApplicationId() + ".",
                loanAccountId
        );

        return new LoanDisbursementResponse(
                app.getLoanApplicationId(),
                loanAccountId,
                targetDisbursementAccount,
                principal,
                rate,
                tenure,
                emi,
                app.getCurrency(),
                "DISBURSED",
                disbursementDate,
                nextDueDate,
                disbursedAt
        );
    }

    /**
     * Validates and performs a state transition atomically, writing history and publishing status-changed event.
     */
    @Transactional
    public void transitionStatus(LoanApplication app, LoanApplicationStatus target,
                                 String actorId, String actorRole, String remarks, String reason) {
        LoanApplicationStatus current = parseStatus(app.getStatus());
        Set<LoanApplicationStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowed.contains(target)) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_STATE_TRANSITION",
                    String.format("Invalid loan application transition from %s to %s.", current, target));
        }

        String previousStatus = app.getStatus();
        app.setStatus(target.name());
        if (remarks != null && !remarks.isBlank()) {
            app.setRemarks(remarks);
        }
        applicationRepository.save(app);

        LoanApplicationHistory history = LoanApplicationHistory.record(
                app.getLoanApplicationId(),
                previousStatus,
                target.name(),
                actorId != null ? actorId : "SYSTEM",
                actorRole != null ? actorRole : "SYSTEM",
                remarks,
                reason
        );
        historyRepository.save(history);

        outboxService.enqueueEvent(
                statusChangedTopic,
                app.getLoanApplicationId(),
                "LOAN_APPLICATION",
                LoanConstants.EVT_APPLICATION_STATUS_CHANGED,
                new LoanEvents.LoanApplicationStatusChangedPayload(
                        app.getLoanApplicationId(),
                        app.getCustomerId(),
                        app.getIdentitySubject(),
                        previousStatus,
                        target.name(),
                        actorId,
                        actorRole,
                        remarks,
                        reason,
                        Instant.now()
                )
        );
        log.info("Loan application {} transitioned: {} -> {} by {} ({})",
                app.getLoanApplicationId(), previousStatus, target, actorId, actorRole);
    }

    private LoanApplication findApplicationOrThrow(String applicationId) {
        return applicationRepository.findByLoanApplicationId(applicationId)
                .orElseThrow(() -> ApiException.notFound("APPLICATION_NOT_FOUND",
                        "Loan application not found: " + applicationId));
    }

    private LoanApplicationStatus parseStatus(String raw) {
        if ("PENDING_KYC_REVIEW".equalsIgnoreCase(raw)) {
            return LoanApplicationStatus.SUBMITTED;
        }
        try {
            return LoanApplicationStatus.valueOf(raw.trim().toUpperCase());
        } catch (Exception ex) {
            throw ApiException.conflict("INVALID_APPLICATION_STATE", "Unknown application status: " + raw);
        }
    }

    private String customerRecipient(LoanApplication app) {
        return (app.getIdentitySubject() != null && !app.getIdentitySubject().isBlank())
                ? app.getIdentitySubject()
                : app.getCustomerId();
    }
}
