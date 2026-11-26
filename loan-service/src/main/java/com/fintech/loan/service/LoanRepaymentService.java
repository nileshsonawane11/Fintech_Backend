package com.fintech.loan.service;

import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.LedgerServiceClient;
import com.fintech.loan.client.PaymentServiceClient;
import com.fintech.loan.client.dto.LedgerDtos.*;
import com.fintech.loan.client.dto.PaymentDtos.*;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.RepaymentRequests.ManualRepaymentRequest;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.dto.response.RepaymentResponses.*;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.*;
import com.fintech.loan.event.model.LoanEvents;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.mapper.RepaymentMapper;
import com.fintech.loan.repository.*;
import com.fintech.loan.service.PaymentAllocationService.AllocationBreakdown;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class LoanRepaymentService {

    private static final Logger log = LoggerFactory.getLogger(LoanRepaymentService.class);

    private final LoanAccountAccessHelper accessHelper;
    private final LoanAccountRepository loanAccountRepository;
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final LoanRepaymentAttemptRepository attemptRepository;
    private final LoanChargeRepository chargeRepository;
    private final LoanRepaymentReconciliationRepository reconciliationRepository;
    private final RepaymentAccountService repaymentAccountService;
    private final AccountServiceClient accountServiceClient;
    private final LedgerServiceClient ledgerServiceClient;
    private final PaymentServiceClient paymentServiceClient;
    private final PaymentAllocationService allocationService;
    private final LoanOutboxService outboxService;
    private final LoanNotificationService notificationService;
    private final RepaymentMapper mapper;

    public LoanRepaymentService(
            LoanAccountAccessHelper accessHelper,
            LoanAccountRepository loanAccountRepository,
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanRepaymentRepository repaymentRepository,
            LoanRepaymentAttemptRepository attemptRepository,
            LoanChargeRepository chargeRepository,
            LoanRepaymentReconciliationRepository reconciliationRepository,
            RepaymentAccountService repaymentAccountService,
            AccountServiceClient accountServiceClient,
            LedgerServiceClient ledgerServiceClient,
            PaymentServiceClient paymentServiceClient,
            PaymentAllocationService allocationService,
            LoanOutboxService outboxService,
            LoanNotificationService notificationService,
            RepaymentMapper mapper) {
        this.accessHelper = accessHelper;
        this.loanAccountRepository = loanAccountRepository;
        this.scheduleRepository = scheduleRepository;
        this.repaymentRepository = repaymentRepository;
        this.attemptRepository = attemptRepository;
        this.chargeRepository = chargeRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.repaymentAccountService = repaymentAccountService;
        this.accountServiceClient = accountServiceClient;
        this.ledgerServiceClient = ledgerServiceClient;
        this.paymentServiceClient = paymentServiceClient;
        this.allocationService = allocationService;
        this.outboxService = outboxService;
        this.notificationService = notificationService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public LoanRepaymentSummaryResponse getSummary(String loanAccountId, String actorSubject, boolean isStaff) {
        LoanAccount loan = accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        List<LoanRepaymentSchedule> schedules = scheduleRepository.findByLoanAccountIdOrderByInstallmentNumberAsc(loanAccountId);
        List<LoanCharge> pendingChargesList = chargeRepository.findByLoanAccountIdAndStatusInOrderByAssessedDateAsc(
                loanAccountId, List.of(LoanChargeStatus.PENDING, LoanChargeStatus.PARTIALLY_PAID));

        BigDecimal overdueAmount = schedules.stream()
                .filter(s -> s.getStatus() == InstallmentStatus.OVERDUE)
                .map(s -> s.getRemainingAmount() != null ? s.getRemainingAmount() : s.getTotalAmount().subtract(nonNull(s.getPaidAmount())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal pendingCharges = pendingChargesList.stream()
                .map(LoanCharge::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long paidCount = schedules.stream().filter(s -> s.getStatus() == InstallmentStatus.PAID).count();
        long remainingCount = schedules.size() - paidCount;

        boolean closureEligible = "ACTIVE".equalsIgnoreCase(loan.getStatus())
                && loan.getOutstandingPrincipal().compareTo(BigDecimal.ZERO) > 0;

        return new LoanRepaymentSummaryResponse(
                loan.getLoanAccountId(),
                loan.getProductCode(),
                loan.getStatus(),
                loan.getCurrency(),
                loan.getApprovedAmount() != null ? loan.getApprovedAmount() : loan.getPrincipalAmount(),
                loan.getDisbursedAmount() != null ? loan.getDisbursedAmount() : loan.getPrincipalAmount(),
                loan.getOutstandingPrincipal(),
                overdueAmount,
                pendingCharges,
                nonNull(loan.getTotalPrincipalRepaid()),
                nonNull(loan.getTotalInterestRepaid()),
                nonNull(loan.getTotalChargesRepaid()),
                loan.getEmiAmount(),
                loan.getNextDueDate(),
                loan.getDpd() != null ? loan.getDpd() : 0,
                paidCount,
                remainingCount,
                closureEligible
        );
    }

    @Transactional(readOnly = true)
    public List<InstallmentDetailResponse> getDues(String loanAccountId, String actorSubject, boolean isStaff) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        return scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(
                        loanAccountId,
                        List.of(InstallmentStatus.OVERDUE, InstallmentStatus.PARTIALLY_PAID, InstallmentStatus.DUE)
                ).stream()
                .map(mapper::toInstallmentDetailResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InstallmentDetailResponse> getUpcomingInstallments(String loanAccountId, String actorSubject, boolean isStaff) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        return scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(
                        loanAccountId,
                        List.of(InstallmentStatus.DUE, InstallmentStatus.UPCOMING)
                ).stream()
                .map(mapper::toInstallmentDetailResponse)
                .toList();
    }

    @Transactional(noRollbackFor = ApiException.class)
    public RepaymentResponse initiateManualRepayment(
            String loanAccountId, ManualRepaymentRequest request, String idempotencyKey, String actorSubject) {

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<LoanRepayment> existing = repaymentRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return mapper.toRepaymentResponse(existing.get());
            }
        }

        LoanAccount loan = loanAccountRepository.findWithLockByLoanAccountId(loanAccountId)
                .orElseThrow(() -> ApiException.notFound("LOAN_ACCOUNT_NOT_FOUND",
                        "Loan account not found: " + loanAccountId));
        if (!accessHelper.isOwner(loan, actorSubject)) {
            throw ApiException.forbidden("ACCESS_DENIED", "You do not own loan account: " + loanAccountId);
        }
        if (!"ACTIVE".equalsIgnoreCase(loan.getStatus())) {
            throw ApiException.unprocessable("LOAN_NOT_ACTIVE",
                    "Repayments are only allowed on ACTIVE loans. Current status: " + loan.getStatus());
        }

        return executeRepayment(
                loan,
                request.installmentId(),
                request.repaymentAccountId(),
                null,
                request.paymentMethod(),
                request.amount(),
                RepaymentType.EMI,
                idempotencyKey,
                false,
                request.vpaOrInstrumentRef()
        );
    }

    @Transactional(noRollbackFor = ApiException.class)
    public RepaymentResponse executeRepayment(
            LoanAccount loan,
            String installmentId,
            String requestedRepaymentAccountId,
            String mandateId,
            RepaymentMethod method,
            BigDecimal amount,
            RepaymentType repaymentType,
            String idempotencyKey,
            boolean autoCollection,
            String vpaOrInstrumentRef) {

        BigDecimal payAmount = amount.setScale(2, RoundingMode.HALF_UP);
        if (payAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("INVALID_REPAYMENT_AMOUNT", "Repayment amount must be positive.");
        }

        String repaymentId = "RPM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        String repaymentRef = "RPY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        LoanRepayment repayment = new LoanRepayment();
        repayment.setRepaymentId(repaymentId);
        repayment.setRepaymentReference(repaymentRef);
        repayment.setIdempotencyKey(idempotencyKey);
        repayment.setLoanAccountId(loan.getLoanAccountId());
        repayment.setCustomerId(loan.getCustomerId());
        repayment.setIdentitySubject(loan.getIdentitySubject());
        repayment.setInstallmentId(installmentId);
        repayment.setMandateId(mandateId);
        repayment.setRepaymentType(repaymentType);
        repayment.setPaymentMethod(method);
        repayment.setAmount(payAmount);
        repayment.setCurrency(loan.getCurrency());
        repayment.setRepaymentStatus(RepaymentStatus.INITIATED);
        repayment.setAutoCollection(autoCollection);
        repayment = repaymentRepository.save(repayment);

        LoanRepaymentAttempt attempt = createAttempt(repayment, 1,
                idempotencyKey != null ? idempotencyKey : repaymentRef);

        publishRepaymentEvent(LoanConstants.TOPIC_REPAYMENT_INITIATED, "LoanRepaymentInitiated", repayment);

        if (method == RepaymentMethod.INTERNAL_ACCOUNT) {
            return processInternalAccountRepayment(loan, repayment, attempt, requestedRepaymentAccountId);
        }
        return processExternalInitiation(loan, repayment, attempt, mandateId, vpaOrInstrumentRef);
    }

    private RepaymentResponse processInternalAccountRepayment(
            LoanAccount loan, LoanRepayment repayment, LoanRepaymentAttempt attempt, String requestedRepaymentAccountId) {

        LoanRepaymentAccount repAccount = repaymentAccountService.resolveActiveRepaymentAccount(
                loan.getLoanAccountId(), requestedRepaymentAccountId);
        repayment.setRepaymentAccountId(repAccount.getRepaymentAccountId());

        // Validate source account ownership, status, and available balance
        accountServiceClient.validateRepaymentAccount(
                repAccount.getExternalAccountId(),
                loan.getIdentitySubject(),
                loan.getCustomerId(),
                loan.getCurrency()
        );

        LedgerBalanceDto balanceDto = ledgerServiceClient.getAccountBalance(repAccount.getExternalAccountId());
        BigDecimal available = balanceDto.availableBalance() != null
                ? balanceDto.availableBalance() : balanceDto.ledgerBalance();
        if (available == null || available.compareTo(repayment.getAmount()) < 0) {
            return failRepayment(loan, repayment, attempt, "INSUFFICIENT_BALANCE",
                    "Insufficient available balance in repayment account " + repAccount.getMaskedAccountNumber(),
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // Preview allocation to construct exact balanced ledger legs
        AllocationBreakdown preview = allocationService.previewEmiAllocation(
                loan, repayment.getInstallmentId(), repayment.getAmount());

        MultiLinePostingRequest ledgerRequest = buildRepaymentLedgerRequest(
                repayment,
                repAccount.getExternalAccountId(),
                preview
        );

        try {
            LedgerPostingResponseDto ledgerResp = ledgerServiceClient.postBatch(
                    repayment.getRepaymentReference(), ledgerRequest);
            repayment.setLedgerTransactionReference(ledgerResp.transactionId());
            repayment.setTransactionReference(ledgerResp.transactionId());
            attempt.setProviderReference(ledgerResp.transactionId());
            attempt.setStatus(CollectionAttemptStatus.SUCCESS);
            attemptRepository.save(attempt);
        } catch (ApiException ex) {
            if ("INSUFFICIENT_BALANCE_OR_INELIGIBLE".equals(ex.getCode())) {
                return failRepayment(loan, repayment, attempt, ex.getCode(), ex.getMessage(), HttpStatus.UNPROCESSABLE_ENTITY);
            }
            // Timeout / unknown ledger outcome -> keep PENDING and open reconciliation (never double-debit)
            repayment.setRepaymentStatus(RepaymentStatus.PENDING);
            repayment.setFailureCode(ex.getCode());
            repayment.setFailureReason(ex.getMessage());
            repaymentRepository.save(repayment);

            attempt.setStatus(CollectionAttemptStatus.UNKNOWN);
            attempt.setFailureCode(ex.getCode());
            attempt.setFailureReason(ex.getMessage());
            attemptRepository.save(attempt);

            openReconciliation(ReconciliationType.REPAYMENT_DEBIT_SUCCESS_LEDGER_FAILED, repayment, ex.getMessage());
            throw ex;
        }

        return finalizeSettledRepayment(loan, repayment);
    }

    private RepaymentResponse processExternalInitiation(
            LoanAccount loan, LoanRepayment repayment, LoanRepaymentAttempt attempt,
            String mandateId, String vpaOrInstrumentRef) {
        try {
            CollectionOrderResponse col = paymentServiceClient.initiateCollection(
                    repayment.getRepaymentReference(),
                    new InitiateCollectionRequest(
                            "LOAN-SERVICE",
                            repayment.getRepaymentReference(),
                            loan.getCustomerId(),
                            repayment.getPaymentMethod().name(),
                            repayment.getAmount(),
                            loan.getCurrency(),
                            mandateId,
                            vpaOrInstrumentRef
                    )
            );
            repayment.setPaymentReference(col.collectionReference());
            repayment.setTransactionReference(col.providerReference());
            repayment.setRepaymentStatus(RepaymentStatus.PENDING);
            repaymentRepository.save(repayment);

            attempt.setProviderReference(col.providerReference());
            attempt.setStatus(CollectionAttemptStatus.PENDING);
            attemptRepository.save(attempt);

            return mapper.toRepaymentResponse(repayment);
        } catch (ApiException ex) {
            if ("PAYMENT_SERVICE_TIMEOUT".equals(ex.getCode())) {
                repayment.setRepaymentStatus(RepaymentStatus.PENDING);
                repayment.setFailureCode(ex.getCode());
                repayment.setFailureReason(ex.getMessage());
                repaymentRepository.save(repayment);

                attempt.setStatus(CollectionAttemptStatus.UNKNOWN);
                attempt.setFailureCode(ex.getCode());
                attempt.setFailureReason(ex.getMessage());
                attemptRepository.save(attempt);

                openReconciliation(ReconciliationType.REPAYMENT_UNKNOWN_PROVIDER_OUTCOME, repayment, ex.getMessage());
                return mapper.toRepaymentResponse(repayment);
            }
            return failRepayment(loan, repayment, attempt, ex.getCode(), ex.getMessage(), ex.getHttpStatus());
        }
    }

    @Transactional
    public RepaymentResponse processExternalCollectionOutcome(
            String collectionOrRepaymentRef, String status, String providerRef,
            String failureCode, String failureReason) {

        LoanRepayment repayment = repaymentRepository.findByPaymentReference(collectionOrRepaymentRef)
                .or(() -> repaymentRepository.findByRepaymentReference(collectionOrRepaymentRef))
                .or(() -> repaymentRepository.findByRepaymentId(collectionOrRepaymentRef))
                .orElseThrow(() -> ApiException.notFound("REPAYMENT_NOT_FOUND",
                        "Repayment not found for reference: " + collectionOrRepaymentRef));

        if (repayment.getRepaymentStatus() == RepaymentStatus.SUCCESS && "SUCCESS".equalsIgnoreCase(status)) {
            return mapper.toRepaymentResponse(repayment);
        }

        LoanAccount loan = loanAccountRepository.findWithLockByLoanAccountId(repayment.getLoanAccountId())
                .orElseThrow(() -> ApiException.notFound("LOAN_ACCOUNT_NOT_FOUND",
                        "Loan account not found: " + repayment.getLoanAccountId()));

        String normalized = status.trim().toUpperCase();
        if ("SUCCESS".equals(normalized) || "CAPTURED".equals(normalized)) {
            if (repayment.getLedgerTransactionReference() == null) {
                AllocationBreakdown preview = allocationService.previewEmiAllocation(
                        loan, repayment.getInstallmentId(), repayment.getAmount());
                MultiLinePostingRequest ledgerReq = buildRepaymentLedgerRequest(
                        repayment, LoanConstants.LEDGER_SYSTEM_SETTLEMENT_INR, preview);
                LedgerPostingResponseDto ledgerResp = ledgerServiceClient.postBatch(
                        repayment.getRepaymentReference(), ledgerReq);
                repayment.setLedgerTransactionReference(ledgerResp.transactionId());
                repayment.setTransactionReference(providerRef != null ? providerRef : ledgerResp.transactionId());
            }
            attemptRepository.findByRepaymentIdOrderByAttemptNumberAsc(repayment.getRepaymentId())
                    .stream().reduce((a, b) -> b).ifPresent(last -> {
                        last.setStatus(CollectionAttemptStatus.SUCCESS);
                        if (providerRef != null) last.setProviderReference(providerRef);
                        attemptRepository.save(last);
                    });
            return finalizeSettledRepayment(loan, repayment);
        }

        if ("REVERSED".equals(normalized) || "REFUNDED".equals(normalized)) {
            return reverseSettledRepayment(loan, repayment, failureReason != null ? failureReason : "External payment reversed");
        }

        // FAILED
        LoanRepaymentAttempt lastAttempt = attemptRepository.findByRepaymentIdOrderByAttemptNumberAsc(repayment.getRepaymentId())
                .stream().reduce((a, b) -> b).orElse(null);
        repayment.setRepaymentStatus(RepaymentStatus.FAILED);
        repayment.setFailureCode(failureCode != null ? failureCode : "PROVIDER_PAYMENT_FAILED");
        repayment.setFailureReason(failureReason != null ? failureReason : "External payment failed");
        repaymentRepository.save(repayment);
        if (lastAttempt != null) {
            lastAttempt.setStatus(CollectionAttemptStatus.FAILED);
            lastAttempt.setFailureCode(repayment.getFailureCode());
            lastAttempt.setFailureReason(repayment.getFailureReason());
            attemptRepository.save(lastAttempt);
        }
        publishRepaymentEvent(LoanConstants.TOPIC_REPAYMENT_FAILED, "LoanRepaymentFailed", repayment);
        notificationService.notifyCustomer(
                accessHelper.customerRecipient(loan),
                "LOAN_REPAYMENT_FAILED",
                "Loan Repayment Failed: " + loan.getLoanAccountId(),
                "Your repayment of " + loan.getCurrency() + " " + repayment.getAmount()
                        + " failed (" + repayment.getFailureReason() + ").",
                repayment.getRepaymentId()
        );
        return mapper.toRepaymentResponse(repayment);
    }

    @Transactional
    public RepaymentResponse reverseSettledRepayment(LoanAccount loan, LoanRepayment repayment, String reason) {
        if (repayment.getRepaymentStatus() == RepaymentStatus.REVERSED) {
            return mapper.toRepaymentResponse(repayment);
        }
        if (repayment.getLedgerTransactionReference() != null) {
            ledgerServiceClient.reverseTransaction(
                    repayment.getLedgerTransactionReference(),
                    "REV-" + repayment.getRepaymentReference(),
                    "REPAYMENT_REVERSAL",
                    reason
            );
        }
        allocationService.reverseAllocations(loan, repayment);
        repayment.setRepaymentStatus(RepaymentStatus.REVERSED);
        repayment.setReversedAt(Instant.now());
        repayment.setFailureReason(reason);
        repaymentRepository.save(repayment);
        return mapper.toRepaymentResponse(repayment);
    }

    private RepaymentResponse finalizeSettledRepayment(LoanAccount loan, LoanRepayment repayment) {
        AllocationBreakdown breakdown = allocationService.applyEmiAllocation(loan, repayment);

        repayment.setRepaymentStatus(RepaymentStatus.SUCCESS);
        repayment.setCompletedAt(Instant.now());
        if (repayment.getReceiptReference() == null) {
            repayment.setReceiptReference("RCP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        }
        repaymentRepository.save(repayment);

        publishRepaymentEvent(LoanConstants.TOPIC_REPAYMENT_COMPLETED, "LoanRepaymentCompleted", repayment);
        publishRepaymentEvent(LoanConstants.TOPIC_REPAYMENT_ALLOCATED, "LoanRepaymentAllocated", repayment);

        boolean partialInstallment = false;
        if (repayment.getInstallmentId() != null) {
            partialInstallment = scheduleRepository.findByInstallmentId(repayment.getInstallmentId())
                    .map(s -> s.getStatus() == InstallmentStatus.PARTIALLY_PAID)
                    .orElse(false);
        }

        if ("CLOSED".equalsIgnoreCase(loan.getStatus())) {
            outboxService.enqueueEvent(
                    LoanConstants.TOPIC_LOAN_CLOSED,
                    loan.getLoanAccountId(),
                    "LOAN_ACCOUNT",
                    "LoanClosed",
                    new LoanEvents.LoanClosedPayload(
                            loan.getLoanAccountId(),
                            loan.getCustomerId(),
                            repayment.getRepaymentType().name(),
                            repayment.getAmount(),
                            loan.getClosedAt()
                    )
            );
            notificationService.notifyCustomer(
                    accessHelper.customerRecipient(loan),
                    "LOAN_CLOSED",
                    "Loan Account Closed: " + loan.getLoanAccountId(),
                    "Congratulations! Your loan " + loan.getLoanAccountId() + " has been fully settled and CLOSED.",
                    loan.getLoanAccountId()
            );
        } else if (partialInstallment) {
            notificationService.notifyCustomer(
                    accessHelper.customerRecipient(loan),
                    "LOAN_PARTIAL_REPAYMENT",
                    "Partial Loan Payment Received: " + loan.getLoanAccountId(),
                    "We received " + loan.getCurrency() + " " + repayment.getAmount()
                            + " (Receipt: " + repayment.getReceiptReference() + "). Remaining installment balance is still due.",
                    repayment.getRepaymentId()
            );
        } else {
            notificationService.notifyCustomer(
                    accessHelper.customerRecipient(loan),
                    "LOAN_REPAYMENT_SUCCESS",
                    "Loan Repayment Successful: " + loan.getLoanAccountId(),
                    "Payment of " + loan.getCurrency() + " " + repayment.getAmount()
                            + " succeeded (Principal: " + breakdown.principalAmount()
                            + ", Interest: " + breakdown.interestAmount()
                            + ", Receipt: " + repayment.getReceiptReference() + ").",
                    repayment.getRepaymentId()
            );
        }

        log.info("Repayment settled: repaymentId={}, loan={}, amount={}, principal={}, interest={}, charges={}, ledgerTx={}",
                repayment.getRepaymentId(), loan.getLoanAccountId(), repayment.getAmount(),
                breakdown.principalAmount(), breakdown.interestAmount(), breakdown.chargesAmount(),
                repayment.getLedgerTransactionReference());

        return mapper.toRepaymentResponse(repayment);
    }

    private MultiLinePostingRequest buildRepaymentLedgerRequest(
            LoanRepayment repayment, String debitSourceAccount, AllocationBreakdown breakdown) {
        String correlationId = MDC.get(LoanConstants.MDC_CORRELATION_ID);
        List<PostingEntryRequest> entries = new ArrayList<>();
        entries.add(new PostingEntryRequest(
                debitSourceAccount,
                "DEBIT",
                repayment.getAmount(),
                "Loan repayment debit - " + repayment.getLoanAccountId(),
                repayment.getRepaymentReference()
        ));

        BigDecimal principalLeg = breakdown.principalAmount().add(nonNull(breakdown.excessAmount()));
        if (principalLeg.compareTo(BigDecimal.ZERO) > 0) {
            entries.add(new PostingEntryRequest(
                    LoanConstants.LEDGER_LOAN_PRINCIPAL_INR,
                    "CREDIT",
                    principalLeg,
                    "Loan principal repayment - " + repayment.getLoanAccountId(),
                    repayment.getRepaymentReference()
            ));
        }
        if (breakdown.interestAmount().compareTo(BigDecimal.ZERO) > 0) {
            entries.add(new PostingEntryRequest(
                    LoanConstants.LEDGER_LOAN_INTEREST_INR,
                    "CREDIT",
                    breakdown.interestAmount(),
                    "Loan interest repayment - " + repayment.getLoanAccountId(),
                    repayment.getRepaymentReference()
            ));
        }
        if (breakdown.chargesAmount().compareTo(BigDecimal.ZERO) > 0) {
            entries.add(new PostingEntryRequest(
                    LoanConstants.LEDGER_LOAN_PENALTY_INR,
                    "CREDIT",
                    breakdown.chargesAmount(),
                    "Loan charges repayment - " + repayment.getLoanAccountId(),
                    repayment.getRepaymentReference()
            ));
        }

        // Fallback if entire payment exceeds modeled legs (balance safety)
        if (entries.size() == 1) {
            entries.add(new PostingEntryRequest(
                    LoanConstants.LEDGER_LOAN_PRINCIPAL_INR,
                    "CREDIT",
                    repayment.getAmount(),
                    "Loan repayment credit - " + repayment.getLoanAccountId(),
                    repayment.getRepaymentReference()
            ));
        }

        String txType = switch (repayment.getRepaymentType()) {
            case PART_PREPAYMENT -> "LOAN_PREPAYMENT";
            case FORECLOSURE -> "LOAN_FORECLOSURE";
            default -> "LOAN_REPAYMENT";
        };

        return new MultiLinePostingRequest(
                txType,
                repayment.getCurrency(),
                correlationId != null ? correlationId : repayment.getRepaymentReference(),
                "Loan repayment " + repayment.getRepaymentReference(),
                repayment.getRepaymentReference(),
                entries
        );
    }

    private RepaymentResponse failRepayment(
            LoanAccount loan, LoanRepayment repayment, LoanRepaymentAttempt attempt,
            String code, String reason, HttpStatus status) {
        repayment.setRepaymentStatus(RepaymentStatus.FAILED);
        repayment.setFailureCode(code);
        repayment.setFailureReason(reason);
        repaymentRepository.save(repayment);

        attempt.setStatus(CollectionAttemptStatus.FAILED);
        attempt.setFailureCode(code);
        attempt.setFailureReason(reason);
        attemptRepository.save(attempt);

        publishRepaymentEvent(LoanConstants.TOPIC_REPAYMENT_FAILED, "LoanRepaymentFailed", repayment);
        notificationService.notifyCustomer(
                accessHelper.customerRecipient(loan),
                "LOAN_REPAYMENT_FAILED",
                "Loan Repayment Failed: " + loan.getLoanAccountId(),
                "Repayment of " + loan.getCurrency() + " " + repayment.getAmount() + " failed: " + reason,
                repayment.getRepaymentId()
        );
        throw new ApiException(status, code, reason);
    }

    private LoanRepaymentAttempt createAttempt(LoanRepayment repayment, int attemptNo, String idempotencyKey) {
        LoanRepaymentAttempt a = new LoanRepaymentAttempt();
        a.setAttemptId("ATT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        a.setRepaymentId(repayment.getRepaymentId());
        a.setAttemptNumber(attemptNo);
        a.setIdempotencyKey(idempotencyKey);
        a.setStatus(CollectionAttemptStatus.INITIATED);
        return attemptRepository.save(a);
    }

    private void openReconciliation(ReconciliationType type, LoanRepayment repayment, String reason) {
        LoanRepaymentReconciliation rec = new LoanRepaymentReconciliation();
        rec.setReconciliationId("REC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        rec.setReconciliationType(type);
        rec.setReferenceId(repayment.getRepaymentReference());
        rec.setLoanAccountId(repayment.getLoanAccountId());
        rec.setExpectedAmount(repayment.getAmount());
        rec.setPaymentReference(repayment.getPaymentReference());
        rec.setLedgerTransactionReference(repayment.getLedgerTransactionReference());
        rec.setStatus(ReconciliationStatus.OPEN);
        rec.setFailureReason(reason);
        reconciliationRepository.save(rec);
    }

    private void publishRepaymentEvent(String topic, String eventType, LoanRepayment r) {
        outboxService.enqueueEvent(
                topic,
                r.getRepaymentId(),
                "LOAN_REPAYMENT",
                eventType,
                new LoanEvents.LoanRepaymentEventPayload(
                        r.getRepaymentId(),
                        r.getRepaymentReference(),
                        r.getLoanAccountId(),
                        r.getCustomerId(),
                        r.getInstallmentId(),
                        r.getAmount(),
                        r.getPrincipalAmount(),
                        r.getInterestAmount(),
                        r.getChargesAmount(),
                        r.getPaymentMethod().name(),
                        r.getRepaymentStatus().name(),
                        r.getLedgerTransactionReference(),
                        r.getFailureCode(),
                        Instant.now()
                )
        );
    }

    @Transactional(readOnly = true)
    public PagedResponse<RepaymentResponse> listRepayments(String loanAccountId, int page, int size,
                                                           String actorSubject, boolean isStaff) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        Page<LoanRepayment> paged = repaymentRepository.findByLoanAccountIdOrderByInitiatedAtDesc(
                loanAccountId, PageRequest.of(Math.max(0, page), clampSize(size)));
        return PagedResponse.of(paged.map(mapper::toRepaymentResponse));
    }

    @Transactional(readOnly = true)
    public RepaymentResponse getRepayment(String loanAccountId, String repaymentId, String actorSubject, boolean isStaff) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        LoanRepayment r = findRepaymentForLoan(loanAccountId, repaymentId);
        return mapper.toRepaymentResponse(r);
    }

    @Transactional(readOnly = true)
    public RepaymentReceiptResponse getReceipt(String loanAccountId, String repaymentId, String actorSubject, boolean isStaff) {
        accessHelper.getOwnedOrStaffLoanAccount(loanAccountId, actorSubject, isStaff);
        LoanRepayment r = findRepaymentForLoan(loanAccountId, repaymentId);
        if (r.getRepaymentStatus() != RepaymentStatus.SUCCESS) {
            throw ApiException.unprocessable("RECEIPT_NOT_AVAILABLE",
                    "Receipt is only available for SUCCESS repayments. Current status: " + r.getRepaymentStatus());
        }
        return mapper.toReceiptResponse(r);
    }

    private LoanRepayment findRepaymentForLoan(String loanAccountId, String repaymentId) {
        LoanRepayment r = repaymentRepository.findByRepaymentId(repaymentId)
                .orElseThrow(() -> ApiException.notFound("REPAYMENT_NOT_FOUND", "Repayment not found: " + repaymentId));
        if (!r.getLoanAccountId().equals(loanAccountId)) {
            throw ApiException.forbidden("REPAYMENT_MISMATCH", "Repayment does not belong to loan " + loanAccountId);
        }
        return r;
    }

    private int clampSize(int size) {
        return (size <= 0 || size > LoanConstants.MAX_PAGE_SIZE) ? LoanConstants.DEFAULT_PAGE_SIZE : size;
    }

    private BigDecimal nonNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
}
