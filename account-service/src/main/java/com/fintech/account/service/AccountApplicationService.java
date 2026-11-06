package com.fintech.account.service;

import com.fintech.account.client.CustomerProfileDto;
import com.fintech.account.client.CustomerServiceClient;
import com.fintech.account.dto.request.AccountApplicationRequest;
import com.fintech.account.dto.request.ApproveApplicationRequest;
import com.fintech.account.dto.request.NomineeRequest;
import com.fintech.account.dto.request.RejectApplicationRequest;
import com.fintech.account.dto.response.AccountApplicationResponse;
import com.fintech.account.dto.response.ApplicationApprovalResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountApplication;
import com.fintech.account.entity.AccountProduct;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.ApplicationStatus;
import com.fintech.account.event.model.AccountEvents.*;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountApplicationRepository;
import com.fintech.account.repository.AccountProductRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.security.SecurityUtils;
import com.fintech.account.util.AuditLogger;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

@Service
public class AccountApplicationService {

    private final AccountApplicationRepository applicationRepository;
    private final AccountProductRepository productRepository;
    private final AccountRepository accountRepository;
    private final CustomerServiceClient customerServiceClient;
    private final AccountNumberGenerator numberGenerator;
    private final OutboxEventService outboxEventService;
    private final NomineeService nomineeService;
    private final IdempotencyService idempotencyService;
    private final AuditLogger auditLogger;

    public AccountApplicationService(
            AccountApplicationRepository applicationRepository,
            AccountProductRepository productRepository,
            AccountRepository accountRepository,
            CustomerServiceClient customerServiceClient,
            AccountNumberGenerator numberGenerator,
            OutboxEventService outboxEventService,
            NomineeService nomineeService,
            IdempotencyService idempotencyService,
            AuditLogger auditLogger) {
        this.applicationRepository = applicationRepository;
        this.productRepository = productRepository;
        this.accountRepository = accountRepository;
        this.customerServiceClient = customerServiceClient;
        this.numberGenerator = numberGenerator;
        this.outboxEventService = outboxEventService;
        this.nomineeService = nomineeService;
        this.idempotencyService = idempotencyService;
        this.auditLogger = auditLogger;
    }

    public AccountApplicationResponse apply(String identitySubject, String idempotencyKey, AccountApplicationRequest request) {
        return idempotencyService.execute(
                idempotencyKey,
                "APPLY_ACCOUNT",
                request,
                AccountApplicationResponse.class,
                () -> executeApply(identitySubject, request)
        );
    }

    @Transactional
    protected AccountApplicationResponse executeApply(String identitySubject, AccountApplicationRequest request) {
        // 1. Verify KYC and Customer existence
        CustomerProfileDto customer = customerServiceClient.getCustomerProfile(identitySubject);
        String customerId = customer.customerId();

        // 2. Verify Product existence and active status
        AccountProduct product = productRepository.findByProductCode(request.productCode())
                .orElseThrow(() -> AccountException.unprocessable("PRODUCT_NOT_ELIGIBLE",
                        "The selected account product does not exist."));

        if (!product.isActive()) {
            throw AccountException.unprocessable("PRODUCT_NOT_ELIGIBLE",
                    "The selected account product is currently inactive.");
        }

        // 3. Verify Age Eligibility if customer date of birth is known
        if (customer.dateOfBirth() != null) {
            int age = Period.between(customer.dateOfBirth(), LocalDate.now()).getYears();
            if (product.getMinimumAge() != null && age < product.getMinimumAge()) {
                throw AccountException.unprocessable("PRODUCT_NOT_ELIGIBLE",
                        "Customer does not meet the minimum age requirement (" + product.getMinimumAge() + " years) for this product.");
            }
            if (product.getMaximumAge() != null && age > product.getMaximumAge()) {
                throw AccountException.unprocessable("PRODUCT_NOT_ELIGIBLE",
                        "Customer exceeds the maximum age limit (" + product.getMaximumAge() + " years) for this product.");
            }
        }

        // 4. Verify minimum initial funding
        if (request.initialFundingAmount() == null ||
            request.initialFundingAmount().compareTo(product.getMinimumInitialFunding()) < 0) {
            throw AccountException.unprocessable("INVALID_INITIAL_FUNDING",
                    "Initial funding amount must be at least " + product.getMinimumInitialFunding() + " " + product.getCurrency());
        }

        // 5. Check duplicate active applications
        Set<ApplicationStatus> activeStatuses = Set.of(
                ApplicationStatus.SUBMITTED,
                ApplicationStatus.PENDING_APPROVAL,
                ApplicationStatus.UNDER_REVIEW
        );
        if (applicationRepository.existsByIdentitySubjectAndProductCodeAndApplicationStatusIn(
                identitySubject, request.productCode(), activeStatuses)) {
            throw AccountException.conflict("DUPLICATE_APPLICATION",
                    "An active application for product " + request.productCode() + " is already in progress.");
        }

        // 6. Validate Nominee if provided
        if (request.nominee() != null) {
            validateNomineeRequest(request.nominee());
        }

        // 7. Create application record
        String appNumber = numberGenerator.generateApplicationNumber();
        Instant now = Instant.now();
        Instant estimatedCompletion = now.plus(24, ChronoUnit.HOURS);

        AccountApplication application = new AccountApplication();
        application.setApplicationNumber(appNumber);
        application.setCustomerId(customerId);
        application.setIdentitySubject(identitySubject);
        application.setProductId(product.getId());
        application.setProductCode(product.getProductCode());
        application.setInitialFundingAmount(request.initialFundingAmount());
        application.setCurrency(product.getCurrency());
        application.setApplicationStatus(ApplicationStatus.PENDING_APPROVAL);
        application.setSubmittedAt(now);
        application.setEstimatedCompletionTime(estimatedCompletion);

        AccountApplication saved = applicationRepository.save(application);

        // 8. Publish AccountApplicationSubmittedEvent to transactional outbox
        AccountApplicationSubmittedPayload payload = new AccountApplicationSubmittedPayload(
                saved.getApplicationNumber(),
                saved.getCustomerId(),
                saved.getProductCode(),
                saved.getInitialFundingAmount(),
                saved.getCurrency(),
                saved.getApplicationStatus(),
                saved.getSubmittedAt()
        );
        outboxEventService.enqueueEvent(
                saved.getApplicationNumber(),
                "AccountApplication",
                "AccountApplicationSubmittedEvent",
                payload
        );

        auditLogger.logAudit("SUBMIT_APPLICATION", "AccountApplication", saved.getApplicationNumber(),
                identitySubject, "Submitted application for " + saved.getProductCode());

        return AccountApplicationResponse.ofSummary(
                saved.getApplicationNumber(),
                saved.getCustomerId(),
                saved.getProductCode(),
                saved.getApplicationStatus(),
                saved.getEstimatedCompletionTime()
        );
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<AccountApplicationResponse> listMyApplications(
            String identitySubject, ApplicationStatus status, String cursor, int limit) {
        int pageSize = (limit <= 0 || limit > 100) ? 20 : limit;
        Slice<AccountApplication> slice = applicationRepository.findMyApplicationsWithCursor(
                identitySubject, status, cursor, PageRequest.of(0, pageSize));

        List<AccountApplicationResponse> items = slice.getContent().stream()
                .map(this::toDetailedResponse)
                .toList();

        String nextCursor = null;
        if (slice.hasNext() && !items.isEmpty()) {
            nextCursor = items.get(items.size() - 1).accountApplicationId();
        }

        return CursorPagedResponse.of(items, nextCursor, slice.hasNext(), pageSize);
    }

    @Transactional(readOnly = true)
    public AccountApplicationResponse getMyApplication(String identitySubject, String applicationNumber) {
        AccountApplication application = applicationRepository.findByApplicationNumber(applicationNumber)
                .orElseThrow(() -> AccountException.notFound("Application not found: " + applicationNumber));

        if (!application.getIdentitySubject().equals(identitySubject)) {
            throw AccountException.forbidden("ACCESS_DENIED", "You do not own this application.");
        }

        return toDetailedResponse(application);
    }

    @Transactional
    public void cancelMyApplication(String identitySubject, String applicationNumber) {
        AccountApplication application = applicationRepository.findByApplicationNumber(applicationNumber)
                .orElseThrow(() -> AccountException.notFound("Application not found: " + applicationNumber));

        if (!application.getIdentitySubject().equals(identitySubject)) {
            throw AccountException.forbidden("ACCESS_DENIED", "You do not own this application.");
        }

        if (application.getApplicationStatus() == ApplicationStatus.APPROVED ||
            application.getApplicationStatus() == ApplicationStatus.ACCOUNT_CREATED) {
            throw AccountException.unprocessable("CANNOT_CANCEL_APPROVED_APPLICATION",
                    "Application has already been approved or converted to an account and cannot be cancelled.");
        }

        if (application.getApplicationStatus() == ApplicationStatus.CANCELLED) {
            return; // idempotent
        }

        if (application.getApplicationStatus() == ApplicationStatus.REJECTED) {
            throw AccountException.unprocessable("APPLICATION_ALREADY_REJECTED",
                    "Application is already rejected and cannot be cancelled.");
        }

        application.setApplicationStatus(ApplicationStatus.CANCELLED);
        applicationRepository.save(application);

        // Outbox event
        AccountApplicationCancelledPayload payload = new AccountApplicationCancelledPayload(
                application.getApplicationNumber(),
                application.getCustomerId(),
                Instant.now()
        );
        outboxEventService.enqueueEvent(
                application.getApplicationNumber(),
                "AccountApplication",
                "AccountApplicationCancelledEvent",
                payload
        );

        auditLogger.logAudit("CANCEL_APPLICATION", "AccountApplication", application.getApplicationNumber(),
                identitySubject, "Customer cancelled application.");
    }

    @Transactional(readOnly = true)
    public CursorPagedResponse<AccountApplicationResponse> listOpsApplications(
            ApplicationStatus status, String customerId, String productCode,
            Instant fromDate, Instant toDate, String cursor, int limit) {
        int pageSize = (limit <= 0 || limit > 100) ? 20 : limit;
        Slice<AccountApplication> slice = applicationRepository.findOpsApplicationsWithCursor(
                status, customerId, productCode, fromDate, toDate, cursor, PageRequest.of(0, pageSize));

        List<AccountApplicationResponse> items = slice.getContent().stream()
                .map(this::toDetailedResponse)
                .toList();

        String nextCursor = null;
        if (slice.hasNext() && !items.isEmpty()) {
            nextCursor = items.get(items.size() - 1).accountApplicationId();
        }

        return CursorPagedResponse.of(items, nextCursor, slice.hasNext(), pageSize);
    }

    @Transactional(readOnly = true)
    public AccountApplicationResponse getOpsApplication(String applicationNumber) {
        AccountApplication application = applicationRepository.findByApplicationNumber(applicationNumber)
                .orElseThrow(() -> AccountException.notFound("Application not found: " + applicationNumber));

        return toDetailedResponse(application);
    }

    public ApplicationApprovalResponse approveApplication(
            String applicationNumber, String approvedBy, String idempotencyKey, ApproveApplicationRequest request) {
        return idempotencyService.execute(
                idempotencyKey,
                "APPROVE_APPLICATION",
                request,
                ApplicationApprovalResponse.class,
                () -> executeApprove(applicationNumber, approvedBy, request)
        );
    }

    @Transactional
    protected ApplicationApprovalResponse executeApprove(
            String applicationNumber, String approvedBy, ApproveApplicationRequest request) {

        AccountApplication application = applicationRepository.findByApplicationNumber(applicationNumber)
                .orElseThrow(() -> AccountException.notFound("Application not found: " + applicationNumber));

        if (application.getApplicationStatus() == ApplicationStatus.APPROVED ||
            application.getApplicationStatus() == ApplicationStatus.ACCOUNT_CREATED) {
            throw AccountException.conflict("APPLICATION_ALREADY_APPROVED",
                    "Application has already been approved.");
        }

        if (application.getApplicationStatus() == ApplicationStatus.REJECTED ||
            application.getApplicationStatus() == ApplicationStatus.CANCELLED) {
            throw AccountException.unprocessable("INVALID_APPLICATION_STATE",
                    "Application is in " + application.getApplicationStatus() + " state and cannot be approved.");
        }

        AccountProduct product = productRepository.findByProductCode(application.getProductCode())
                .orElseThrow(() -> AccountException.notFound("Associated product not found: " + application.getProductCode()));

        Instant now = Instant.now();
        String accountId = numberGenerator.generateAccountId();
        String accountNumber = numberGenerator.generateAccountNumber();

        // 1. Create Bank Account
        Account account = new Account();
        account.setAccountId(accountId);
        account.setAccountNumber(accountNumber);
        account.setCustomerId(application.getCustomerId());
        account.setIdentitySubject(application.getIdentitySubject());
        account.setApplicationId(application.getId());
        account.setProductId(product.getId());
        account.setProductCode(product.getProductCode());
        account.setAccountType(product.getAccountType());
        account.setCurrency(product.getCurrency());
        account.setAccountStatus(AccountStatus.ACTIVE);
        account.setOpenedAt(now);
        account.setCreatedBy(approvedBy != null ? approvedBy : "OPS");
        account.setUpdatedBy(approvedBy != null ? approvedBy : "OPS");

        Account savedAccount = accountRepository.save(account);

        // 2. Update Application Status
        application.setApplicationStatus(ApplicationStatus.APPROVED);
        application.setApprovedAt(now);
        application.setProcessedBy(approvedBy);
        applicationRepository.save(application);

        // 3. Outbox Events
        AccountApplicationApprovedPayload appPayload = new AccountApplicationApprovedPayload(
                application.getApplicationNumber(),
                application.getCustomerId(),
                application.getProductCode(),
                savedAccount.getAccountId(),
                approvedBy,
                now
        );
        outboxEventService.enqueueEvent(
                application.getApplicationNumber(),
                "AccountApplication",
                "AccountApplicationApprovedEvent",
                appPayload
        );

        AccountCreatedPayload accPayload = new AccountCreatedPayload(
                savedAccount.getAccountId(),
                SecurityUtils.maskAccountNumber(savedAccount.getAccountNumber()),
                savedAccount.getCustomerId(),
                savedAccount.getProductCode(),
                savedAccount.getAccountType(),
                savedAccount.getCurrency(),
                savedAccount.getAccountStatus(),
                savedAccount.getOpenedAt()
        );
        outboxEventService.enqueueEvent(
                savedAccount.getAccountId(),
                "Account",
                "AccountCreatedEvent",
                accPayload
        );

        auditLogger.logAudit("APPROVE_APPLICATION", "AccountApplication", application.getApplicationNumber(),
                approvedBy, "Approved application, created account " + accountId);

        return new ApplicationApprovalResponse(
                application.getApplicationNumber(),
                "APPROVED",
                savedAccount.getAccountId(),
                approvedBy,
                now
        );
    }

    @Transactional
    public void rejectApplication(String applicationNumber, String rejectedBy, RejectApplicationRequest request) {
        AccountApplication application = applicationRepository.findByApplicationNumber(applicationNumber)
                .orElseThrow(() -> AccountException.notFound("Application not found: " + applicationNumber));

        if (application.getApplicationStatus() == ApplicationStatus.APPROVED ||
            application.getApplicationStatus() == ApplicationStatus.ACCOUNT_CREATED) {
            throw AccountException.conflict("APPLICATION_ALREADY_APPROVED",
                    "Application has already been approved and cannot be rejected.");
        }

        if (application.getApplicationStatus() == ApplicationStatus.REJECTED) {
            return; // idempotent
        }

        if (application.getApplicationStatus() == ApplicationStatus.CANCELLED) {
            throw AccountException.unprocessable("APPLICATION_ALREADY_CANCELLED",
                    "Application is cancelled and cannot be rejected.");
        }

        Instant now = Instant.now();
        application.setApplicationStatus(ApplicationStatus.REJECTED);
        application.setRejectionReason(request.reasonCode() + ": " + (request.remarks() != null ? request.remarks() : ""));
        application.setRejectedAt(now);
        application.setProcessedBy(rejectedBy);
        applicationRepository.save(application);

        // Outbox event
        AccountApplicationRejectedPayload payload = new AccountApplicationRejectedPayload(
                application.getApplicationNumber(),
                application.getCustomerId(),
                application.getProductCode(),
                request.reasonCode(),
                request.remarks(),
                rejectedBy,
                now
        );
        outboxEventService.enqueueEvent(
                application.getApplicationNumber(),
                "AccountApplication",
                "AccountApplicationRejectedEvent",
                payload
        );

        auditLogger.logAudit("REJECT_APPLICATION", "AccountApplication", application.getApplicationNumber(),
                rejectedBy, "Rejected with reason: " + request.reasonCode());
    }

    private void validateNomineeRequest(NomineeRequest nominee) {
        if (nominee.dateOfBirth() != null && nominee.dateOfBirth().isAfter(LocalDate.now())) {
            throw AccountException.unprocessable("INVALID_NOMINEE", "Nominee date of birth cannot be in the future.");
        }
        if (nominee.allocationPercentage() != null &&
            (nominee.allocationPercentage() <= 0 || nominee.allocationPercentage() > 100)) {
            throw AccountException.unprocessable("INVALID_NOMINEE", "Nominee allocation percentage must be between 1 and 100.");
        }
    }

    private AccountApplicationResponse toDetailedResponse(AccountApplication app) {
        return new AccountApplicationResponse(
                app.getApplicationNumber(),
                app.getCustomerId(),
                app.getProductCode(),
                app.getApplicationStatus(),
                app.getEstimatedCompletionTime(),
                app.getInitialFundingAmount(),
                app.getCurrency(),
                app.getSubmittedAt(),
                app.getRejectionReason()
        );
    }
}
