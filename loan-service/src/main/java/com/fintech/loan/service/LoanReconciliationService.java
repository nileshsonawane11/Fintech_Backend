package com.fintech.loan.service;

import com.fintech.loan.client.LedgerServiceClient;
import com.fintech.loan.client.PaymentServiceClient;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.RepaymentRequests.ResolveReconciliationRequest;
import com.fintech.loan.dto.response.LoanProductResponses.PagedResponse;
import com.fintech.loan.dto.response.RepaymentResponses.*;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.*;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.mapper.RepaymentMapper;
import com.fintech.loan.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class LoanReconciliationService {

    private final LoanRepaymentRepository repaymentRepository;
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanRepaymentAttemptRepository attemptRepository;
    private final LoanRepaymentReconciliationRepository reconciliationRepository;
    private final LoanAccountRepository loanAccountRepository;
    private final LedgerServiceClient ledgerServiceClient;
    private final PaymentServiceClient paymentServiceClient;
    private final LoanRepaymentService repaymentService;
    private final RepaymentMapper mapper;

    public LoanReconciliationService(
            LoanRepaymentRepository repaymentRepository,
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanRepaymentAttemptRepository attemptRepository,
            LoanRepaymentReconciliationRepository reconciliationRepository,
            LoanAccountRepository loanAccountRepository,
            LedgerServiceClient ledgerServiceClient,
            PaymentServiceClient paymentServiceClient,
            LoanRepaymentService repaymentService,
            RepaymentMapper mapper) {
        this.repaymentRepository = repaymentRepository;
        this.scheduleRepository = scheduleRepository;
        this.attemptRepository = attemptRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.loanAccountRepository = loanAccountRepository;
        this.ledgerServiceClient = ledgerServiceClient;
        this.paymentServiceClient = paymentServiceClient;
        this.repaymentService = repaymentService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PagedResponse<RepaymentResponse> listAllRepayments(RepaymentStatus status, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(0, page), clampSize(size));
        Page<LoanRepayment> paged = status != null
                ? repaymentRepository.findByRepaymentStatusOrderByInitiatedAtDesc(status, pr)
                : repaymentRepository.findAllByOrderByInitiatedAtDesc(pr);
        return PagedResponse.of(paged.map(mapper::toRepaymentResponse));
    }

    @Transactional(readOnly = true)
    public RepaymentResponse getRepaymentById(String repaymentId) {
        LoanRepayment r = repaymentRepository.findByRepaymentId(repaymentId)
                .orElseThrow(() -> ApiException.notFound("REPAYMENT_NOT_FOUND", "Repayment not found: " + repaymentId));
        return mapper.toRepaymentResponse(r);
    }

    @Transactional(readOnly = true)
    public PagedResponse<InstallmentDetailResponse> listOverdueInstallments(int page, int size) {
        Page<LoanRepaymentSchedule> paged = scheduleRepository.findByStatusOrderByDueDateAsc(
                InstallmentStatus.OVERDUE, PageRequest.of(Math.max(0, page), clampSize(size)));
        return PagedResponse.of(paged.map(mapper::toInstallmentDetailResponse));
    }

    @Transactional(readOnly = true)
    public PagedResponse<RepaymentAttemptResponse> listCollectionAttempts(int page, int size) {
        Page<LoanRepaymentAttempt> paged = attemptRepository.findAllByOrderByAttemptTimestampDesc(
                PageRequest.of(Math.max(0, page), clampSize(size)));
        return PagedResponse.of(paged.map(mapper::toAttemptResponse));
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReconciliationResponse> listReconciliations(ReconciliationStatus status, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(0, page), clampSize(size));
        Page<LoanRepaymentReconciliation> paged = status != null
                ? reconciliationRepository.findByStatusOrderByCreatedAtDesc(status, pr)
                : reconciliationRepository.findAllByOrderByCreatedAtDesc(pr);
        return PagedResponse.of(paged.map(mapper::toReconciliationResponse));
    }

    @Transactional
    public RepaymentResponse retryRepayment(String repaymentId) {
        LoanRepayment existing = repaymentRepository.findByRepaymentId(repaymentId)
                .orElseThrow(() -> ApiException.notFound("REPAYMENT_NOT_FOUND", "Repayment not found: " + repaymentId));

        if (existing.getRepaymentStatus() == RepaymentStatus.SUCCESS) {
            return mapper.toRepaymentResponse(existing);
        }

        // For PENDING external payments, verify authoritative provider status before retrying
        if (existing.getRepaymentStatus() == RepaymentStatus.PENDING && existing.getPaymentReference() != null) {
            var colStatus = paymentServiceClient.getCollectionStatus(existing.getPaymentReference());
            if ("SUCCESS".equalsIgnoreCase(colStatus.status()) || "CAPTURED".equalsIgnoreCase(colStatus.status())) {
                return repaymentService.processExternalCollectionOutcome(
                        existing.getPaymentReference(), "SUCCESS", colStatus.providerReference(), null, null);
            }
            if ("PENDING".equalsIgnoreCase(colStatus.status())) {
                return mapper.toRepaymentResponse(existing);
            }
        }

        if (existing.getRepaymentStatus() != RepaymentStatus.FAILED) {
            throw ApiException.unprocessable("REPAYMENT_NOT_RETRYABLE",
                    "Only FAILED repayments can be retried as new collections. Current status: " + existing.getRepaymentStatus());
        }

        LoanAccount loan = loanAccountRepository.findWithLockByLoanAccountId(existing.getLoanAccountId())
                .orElseThrow(() -> ApiException.notFound("LOAN_ACCOUNT_NOT_FOUND",
                        "Loan account not found: " + existing.getLoanAccountId()));

        String retryKey = "RETRY-" + existing.getRepaymentId() + "-" + UUID.randomUUID().toString().substring(0, 8);
        return repaymentService.executeRepayment(
                loan,
                existing.getInstallmentId(),
                existing.getRepaymentAccountId(),
                existing.getMandateId(),
                existing.getPaymentMethod(),
                existing.getAmount(),
                existing.getRepaymentType(),
                retryKey,
                existing.isAutoCollection(),
                null
        );
    }

    @Transactional
    public ReconciliationResponse resolveReconciliation(
            String reconciliationId, ResolveReconciliationRequest request, String actorId) {
        LoanRepaymentReconciliation rec = reconciliationRepository.findByReconciliationId(reconciliationId)
                .orElseThrow(() -> ApiException.notFound("RECONCILIATION_NOT_FOUND",
                        "Reconciliation record not found: " + reconciliationId));

        if (rec.getStatus() == ReconciliationStatus.RESOLVED) {
            return mapper.toReconciliationResponse(rec);
        }

        if (request.retryLedgerPosting() && rec.getLedgerTransactionReference() != null) {
            var txOpt = ledgerServiceClient.getTransactionIfPresent(rec.getLedgerTransactionReference());
            if (txOpt.isPresent()) {
                rec.setLedgerTransactionReference(txOpt.get().transactionId());
            }
        }

        rec.setStatus(ReconciliationStatus.RESOLVED);
        rec.setResolutionNotes(request.resolutionNotes());
        rec.setResolvedBy(actorId);
        rec.setResolvedAt(Instant.now());
        return mapper.toReconciliationResponse(reconciliationRepository.save(rec));
    }

    @Transactional
    public int runPendingReconciliationCheck() {
        List<LoanRepaymentReconciliation> open = reconciliationRepository.findByStatusIn(
                List.of(ReconciliationStatus.OPEN, ReconciliationStatus.RETRYING));
        int resolved = 0;
        for (LoanRepaymentReconciliation rec : open) {
            if (rec.getReconciliationType() == ReconciliationType.REPAYMENT_UNKNOWN_PROVIDER_OUTCOME
                    && rec.getPaymentReference() != null) {
                try {
                    var status = paymentServiceClient.getCollectionStatus(rec.getPaymentReference());
                    if ("SUCCESS".equalsIgnoreCase(status.status()) || "FAILED".equalsIgnoreCase(status.status())) {
                        repaymentService.processExternalCollectionOutcome(
                                rec.getPaymentReference(), status.status(), status.providerReference(),
                                status.failureCode(), status.failureReason());
                        rec.setStatus(ReconciliationStatus.RESOLVED);
                        rec.setResolvedBy("SYSTEM_RECONCILER");
                        rec.setResolvedAt(Instant.now());
                        rec.setResolutionNotes("Resolved via provider status verification: " + status.status());
                        reconciliationRepository.save(rec);
                        resolved++;
                    }
                } catch (Exception ignored) {
                    rec.setRetryCount(rec.getRetryCount() + 1);
                    reconciliationRepository.save(rec);
                }
            }
        }
        return resolved;
    }

    private int clampSize(int size) {
        return (size <= 0 || size > LoanConstants.MAX_PAGE_SIZE) ? LoanConstants.DEFAULT_PAGE_SIZE : size;
    }
}
