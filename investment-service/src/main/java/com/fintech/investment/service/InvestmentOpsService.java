package com.fintech.investment.service;

import com.fintech.investment.config.SecurityUtils;
import com.fintech.investment.dto.InvestmentDtos.*;
import com.fintech.investment.entity.*;
import com.fintech.investment.entity.InvestmentEnums.*;
import com.fintech.investment.exception.ApiException;
import com.fintech.investment.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InvestmentOpsService {

    private final InvestmentApplicationRepository applicationRepository;
    private final InvestmentTransactionRepository transactionRepository;
    private final InvestmentInstallmentScheduleRepository scheduleRepository;
    private final InvestmentDocumentRepository documentRepository;
    private final InvestmentRepository investmentRepository;
    private final InvestmentWithdrawalRequestRepository withdrawalRepository;
    private final InvestmentOutboxEventRepository outboxRepository;
    private final InvestmentReconciliationRepository reconciliationRepository;
    private final InvestmentOpsAlertRepository alertRepository;
    private final InvestmentProductRepository productRepository;
    private final InvestmentApplicationService applicationService;

    public InvestmentOpsService(
            InvestmentApplicationRepository applicationRepository,
            InvestmentTransactionRepository transactionRepository,
            InvestmentInstallmentScheduleRepository scheduleRepository,
            InvestmentDocumentRepository documentRepository,
            InvestmentRepository investmentRepository,
            InvestmentWithdrawalRequestRepository withdrawalRepository,
            InvestmentOutboxEventRepository outboxRepository,
            InvestmentReconciliationRepository reconciliationRepository,
            InvestmentOpsAlertRepository alertRepository,
            InvestmentProductRepository productRepository,
            InvestmentApplicationService applicationService) {
        this.applicationRepository = applicationRepository;
        this.transactionRepository = transactionRepository;
        this.scheduleRepository = scheduleRepository;
        this.documentRepository = documentRepository;
        this.investmentRepository = investmentRepository;
        this.withdrawalRepository = withdrawalRepository;
        this.outboxRepository = outboxRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.alertRepository = alertRepository;
        this.productRepository = productRepository;
        this.applicationService = applicationService;
    }

    @Transactional(readOnly = true)
    public OpsDashboardResponse getOpsDashboard() {
        List<ApplicationResponse> pendingApps = applicationRepository
                .findByStatusInOrderByCreatedAtDesc(List.of(
                        ApplicationStatus.SUBMITTED,
                        ApplicationStatus.DOCUMENT_VERIFICATION,
                        ApplicationStatus.UNDER_REVIEW,
                        ApplicationStatus.APPROVED))
                .stream().map(applicationService::toApplicationResponse).toList();

        List<TransactionResponse> failedTx = transactionRepository
                .findByStatusOrderByCreatedAtDesc(TransactionStatus.FAILED)
                .stream().map(t -> new TransactionResponse(
                        t.getTransactionId(), t.getInvestmentId(), t.getTransactionType(), t.getDirection(),
                        t.getAmount(), t.getCurrency(), t.getStatus(), t.getAccountId(),
                        t.getLedgerTransactionId(), t.getRemarks(), t.getCreatedAt(), t.getCompletedAt()))
                .toList();

        List<InstallmentScheduleResponse> failedInst = scheduleRepository
                .findByStatusOrderByDueDateDesc(InstallmentStatus.FAILED)
                .stream().map(s -> new InstallmentScheduleResponse(
                        s.getScheduleId(), s.getInstallmentNumber(), s.getDueDate(), s.getAmount(),
                        s.getStatus(), s.getPaidAmount(), s.getPenaltyAmount(), s.getPaidAt(),
                        s.getTransactionRef(), s.getRetryCount(), s.getFailureReason()))
                .toList();

        List<DocumentResponse> pendingDocs = documentRepository
                .findByVerificationStatusOrderByCreatedAtAsc("PENDING")
                .stream().map(applicationService::toDocumentResponse).toList();

        LocalDate today = LocalDate.now();
        Map<UUID, InvestmentProduct> productMap = productRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(InvestmentProduct::getId, p -> p, (a, b) -> a));
        List<InvestmentResponse> maturing = investmentRepository
                .findByStatusAndMaturityDateBetween(InvestmentStatus.ACTIVE, today, today.plusDays(30))
                .stream().map(i -> applicationService.toInvestmentResponse(i, productMap.get(i.getProductId()))).toList();

        List<WithdrawalResponse> pendingWithdrawals = withdrawalRepository
                .findByStatusInOrderByCreatedAtDesc(List.of(WithdrawalStatus.REQUESTED, WithdrawalStatus.UNDER_REVIEW))
                .stream().map(w -> new WithdrawalResponse(
                        w.getRequestId(), w.getInvestmentId(), w.getRequestType(), w.getRequestedAmount(),
                        w.getPenaltyAmount(), w.getNetPayoutAmount(), w.getPayoutAccountId(),
                        w.getStatus(), w.getEligibilityNote(), w.getTransactionRef(), w.getCreatedAt(), w.getProcessedAt()))
                .toList();

        long failedOutbox = outboxRepository.findByStatusOrderByCreatedAtDesc(OutboxStatus.FAILED).size();
        long openRecon = reconciliationRepository.findByStatusOrderByCreatedAtDesc("MISMATCH").size();
        long openAlerts = alertRepository.findByStatusOrderByCreatedAtDesc("OPEN").size();

        return new OpsDashboardResponse(
                pendingApps, failedTx, failedInst, pendingDocs, maturing, pendingWithdrawals,
                failedOutbox, openRecon, openAlerts
        );
    }

    @Transactional
    public DocumentResponse verifyDocument(String documentId, boolean approved, String remarks) {
        InvestmentDocument doc = documentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> ApiException.notFound("DOCUMENT_NOT_FOUND", "Document not found: " + documentId));
        doc.setVerificationStatus(approved ? "VERIFIED" : "REJECTED");
        doc.setVerifiedBy(SecurityUtils.getAuthenticatedSubject());
        doc.setVerifiedAt(Instant.now());
        doc.setRemarks(remarks);
        doc = documentRepository.save(doc);
        return applicationService.toDocumentResponse(doc);
    }

    @Transactional
    public void resolveOpsAlert(String alertId) {
        InvestmentOpsAlert alert = alertRepository.findByAlertId(alertId)
                .orElseThrow(() -> ApiException.notFound("ALERT_NOT_FOUND", "Alert not found: " + alertId));
        alert.setStatus("RESOLVED");
        alert.setResolvedBy(SecurityUtils.getAuthenticatedSubject());
        alert.setResolvedAt(Instant.now());
        alertRepository.save(alert);
    }
}
