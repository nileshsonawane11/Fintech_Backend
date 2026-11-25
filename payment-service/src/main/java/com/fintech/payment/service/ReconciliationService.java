package com.fintech.payment.service;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.ResolveReconciliationRequest;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.dto.response.OpsDtos.ReconciliationRecordResponse;
import com.fintech.payment.dto.response.OpsDtos.ReconciliationRunSummaryResponse;
import com.fintech.payment.entity.IncomingPayment;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.entity.ReconciliationRecord;
import com.fintech.payment.enums.IncomingPaymentStatus;
import com.fintech.payment.enums.OutgoingTransferStatus;
import com.fintech.payment.event.model.PaymentEvents.*;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.IncomingCollectionProvider;
import com.fintech.payment.provider.PayoutProvider;
import com.fintech.payment.provider.model.ProviderModels.PayoutResult;
import com.fintech.payment.provider.model.ProviderModels.ProviderPaymentResult;
import com.fintech.payment.repository.IncomingPaymentRepository;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.repository.ReconciliationRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    private final PaymentRepository paymentRepository;
    private final IncomingPaymentRepository incomingPaymentRepository;
    private final ReconciliationRecordRepository reconciliationRepository;
    private final PayoutProvider payoutProvider;
    private final IncomingCollectionProvider collectionProvider;
    private final PaymentService paymentService;
    private final IncomingPaymentService incomingPaymentService;
    private final PaymentOutboxService outboxService;
    private final PaymentAuditService auditService;
    private final boolean scheduledEnabled;
    private final long staleThresholdMinutes;

    public ReconciliationService(
            PaymentRepository paymentRepository,
            IncomingPaymentRepository incomingPaymentRepository,
            ReconciliationRecordRepository reconciliationRepository,
            PayoutProvider payoutProvider,
            IncomingCollectionProvider collectionProvider,
            PaymentService paymentService,
            IncomingPaymentService incomingPaymentService,
            PaymentOutboxService outboxService,
            PaymentAuditService auditService,
            @Value("${payment.reconciliation.enabled:true}") boolean scheduledEnabled,
            @Value("${payment.reconciliation.stale-threshold-minutes:5}") long staleThresholdMinutes) {
        this.paymentRepository = paymentRepository;
        this.incomingPaymentRepository = incomingPaymentRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.payoutProvider = payoutProvider;
        this.collectionProvider = collectionProvider;
        this.paymentService = paymentService;
        this.incomingPaymentService = incomingPaymentService;
        this.outboxService = outboxService;
        this.auditService = auditService;
        this.scheduledEnabled = scheduledEnabled;
        this.staleThresholdMinutes = staleThresholdMinutes;
    }

    @Scheduled(fixedDelayString = "${payment.reconciliation.poll-interval-ms:300000}")
    @Transactional
    public void scheduledReconciliation() {
        if (!scheduledEnabled) {
            return;
        }
        runReconciliation("SYSTEM_SCHEDULER");
    }

    @Transactional
    public ReconciliationRunSummaryResponse runReconciliation(String actorId) {
        String runId = "REC-RUN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        Instant threshold = Instant.now().minus(staleThresholdMinutes, ChronoUnit.MINUTES);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_RECONCILIATION_EVENTS,
                runId,
                "ReconciliationRun",
                PaymentConstants.EVT_RECONCILIATION_STARTED,
                null,
                null,
                new ReconciliationStartedPayload(runId, "FULL", Instant.now())
        );

        int outgoingChecked = 0;
        int incomingChecked = 0;
        int mismatches = 0;
        int autoResolved = 0;

        List<Payment> pendingOutgoing = paymentRepository.findByStatusInAndUpdatedAtBefore(
                List.of(
                        OutgoingTransferStatus.DEBITED_PENDING_SUBMISSION.name(),
                        OutgoingTransferStatus.SUBMITTED.name(),
                        OutgoingTransferStatus.QUEUED.name(),
                        OutgoingTransferStatus.PROCESSING.name(),
                        OutgoingTransferStatus.UNKNOWN_PENDING_RECONCILIATION.name()
                ),
                threshold
        );

        for (Payment p : pendingOutgoing) {
            outgoingChecked++;
            if (p.getProviderPayoutId() == null || p.getProviderPayoutId().isBlank()) {
                mismatches++;
                recordDiscrepancy(runId, "OUTGOING", p.getPaymentId(), p.getRailReference(),
                        p.getStatus(), "MISSING_PROVIDER_ID", p.getAmount(), null, "MISSING_PROVIDER_REFERENCE",
                        "Transfer in state " + p.getStatus() + " has no providerPayoutId");
                continue;
            }
            if (payoutProvider.isPayoutAvailable()) {
                try {
                    PayoutResult remote = payoutProvider.fetchPayout(p.getProviderPayoutId());
                    if (remote.amount() != null && remote.amount().compareTo(p.getAmount()) != 0) {
                        mismatches++;
                        recordDiscrepancy(runId, "OUTGOING", p.getPaymentId(), p.getProviderPayoutId(),
                                p.getStatus(), remote.status(), p.getAmount(), remote.amount(), "AMOUNT_MISMATCH",
                                "Provider payout amount differs from internal transfer amount");
                    } else {
                        String beforeStatus = p.getStatus();
                        paymentService.applyProviderPayoutResult(p, remote);
                        p.setReconciledAt(Instant.now());
                        paymentRepository.save(p);
                        if (!beforeStatus.equals(p.getStatus())) {
                            autoResolved++;
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Reconciliation fetch failed for payout {}: {}", p.getProviderPayoutId(), ex.getMessage());
                }
            }
        }

        List<IncomingPayment> pendingIncoming = incomingPaymentRepository.findByStatusInAndUpdatedAtBefore(
                List.of(
                        IncomingPaymentStatus.RECEIVED.name(),
                        IncomingPaymentStatus.VERIFIED.name(),
                        IncomingPaymentStatus.DISCREPANCY.name()
                ),
                threshold
        );

        for (IncomingPayment ip : pendingIncoming) {
            incomingChecked++;
            if (IncomingPaymentStatus.DISCREPANCY.name().equals(ip.getStatus())) {
                mismatches++;
                recordDiscrepancy(runId, "INCOMING", ip.getIncomingPaymentId(), ip.getProviderPaymentId(),
                        ip.getStatus(), "DISCREPANCY", ip.getAmount(), ip.getAmount(), "INCOMING_DISCREPANCY",
                        ip.getFailureReason());
                continue;
            }
            if (collectionProvider.isAvailable()) {
                try {
                    ProviderPaymentResult remote = collectionProvider.fetchPayment(ip.getProviderPaymentId());
                    if (remote.amount() != null && remote.amount().compareTo(ip.getAmount()) != 0) {
                        mismatches++;
                        recordDiscrepancy(runId, "INCOMING", ip.getIncomingPaymentId(), ip.getProviderPaymentId(),
                                ip.getStatus(), remote.status(), ip.getAmount(), remote.amount(), "AMOUNT_MISMATCH",
                                "Provider payment amount differs from recorded incoming amount");
                    } else if ("captured".equalsIgnoreCase(remote.status())
                            && IncomingPaymentStatus.VERIFIED.name().equals(ip.getStatus())
                            && ip.isSettlementEligible()) {
                        incomingPaymentService.creditVerifiedIncomingPayment(ip.getIncomingPaymentId(), actorId);
                        ip.setReconciledAt(Instant.now());
                        incomingPaymentRepository.save(ip);
                        autoResolved++;
                    }
                } catch (Exception ex) {
                    log.warn("Reconciliation fetch failed for incoming payment {}: {}",
                            ip.getProviderPaymentId(), ex.getMessage());
                }
            }
        }

        Instant completedAt = Instant.now();
        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_RECONCILIATION_EVENTS,
                runId,
                "ReconciliationRun",
                PaymentConstants.EVT_RECONCILIATION_COMPLETED,
                null,
                null,
                new ReconciliationCompletedPayload(runId, outgoingChecked + incomingChecked, mismatches, completedAt)
        );
        auditService.record(actorId, "SYSTEM", "RECONCILIATION_RUN_COMPLETED", "ReconciliationRun", runId,
                String.format("Checked outgoing=%d, incoming=%d, mismatches=%d, autoResolved=%d",
                        outgoingChecked, incomingChecked, mismatches, autoResolved));

        return new ReconciliationRunSummaryResponse(
                runId, outgoingChecked, incomingChecked, 0, mismatches, autoResolved, completedAt);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReconciliationRecordResponse> listDiscrepancies(String resolutionStatus, int page, int size) {
        int clampedSize = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<ReconciliationRecord> result = (resolutionStatus != null && !resolutionStatus.isBlank())
                ? reconciliationRepository.findByResolutionStatusOrderByCreatedAtDesc(
                        resolutionStatus, PageRequest.of(Math.max(page, 0), clampedSize))
                : reconciliationRepository.findAllByOrderByCreatedAtDesc(
                        PageRequest.of(Math.max(page, 0), clampedSize));
        return new PagedResponse<>(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.hasNext()
        );
    }

    @Transactional
    public ReconciliationRecordResponse resolveDiscrepancy(
            String reconciliationId, ResolveReconciliationRequest request, String actorId) {
        ReconciliationRecord record = reconciliationRepository.findByReconciliationId(reconciliationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECONCILIATION_RECORD_NOT_FOUND",
                        "Reconciliation record not found: " + reconciliationId));
        record.setResolutionStatus(request.resolutionStatus());
        record.setNotes(request.notes());
        record.setResolvedBy(actorId);
        record.setResolvedAt(Instant.now());
        reconciliationRepository.save(record);

        auditService.record(actorId, "OPERATIONS", "RECONCILIATION_DISCREPANCY_RESOLVED",
                "ReconciliationRecord", reconciliationId,
                "Status=" + request.resolutionStatus() + " notes=" + request.notes());
        return toResponse(record);
    }

    private void recordDiscrepancy(
            String runId, String targetType, String targetId, String providerRef,
            String internalStatus, String providerStatus, BigDecimal expectedAmount,
            BigDecimal providerAmount, String discrepancyType, String notes) {
        String recId = "REC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 14).toUpperCase();
        ReconciliationRecord rec = new ReconciliationRecord();
        rec.setReconciliationId(recId);
        rec.setRunId(runId);
        rec.setTargetType(targetType);
        rec.setTargetId(targetId);
        rec.setProviderRef(providerRef);
        rec.setInternalStatus(internalStatus);
        rec.setProviderStatus(providerStatus);
        rec.setExpectedAmount(expectedAmount);
        rec.setProviderAmount(providerAmount);
        rec.setDiscrepancyType(discrepancyType);
        rec.setResolutionStatus("OPEN");
        rec.setNotes(notes);
        reconciliationRepository.save(rec);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_RECONCILIATION_EVENTS,
                recId,
                "ReconciliationRecord",
                PaymentConstants.EVT_RECONCILIATION_MISMATCH_DETECTED,
                null,
                providerRef,
                new ReconciliationMismatchDetectedPayload(
                        recId, runId, targetType, targetId, discrepancyType, internalStatus, providerStatus, Instant.now())
        );
    }

    private ReconciliationRecordResponse toResponse(ReconciliationRecord r) {
        return new ReconciliationRecordResponse(
                r.getReconciliationId(),
                r.getRunId(),
                r.getTargetType(),
                r.getTargetId(),
                r.getProviderRef(),
                r.getInternalStatus(),
                r.getProviderStatus(),
                r.getExpectedAmount(),
                r.getProviderAmount(),
                r.getDiscrepancyType(),
                r.getResolutionStatus(),
                r.getNotes(),
                r.getResolvedBy(),
                r.getCreatedAt(),
                r.getResolvedAt()
        );
    }
}
