package com.fintech.payment.service;

import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.dto.request.ResolveReconciliationRequest;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.dto.response.OpsDtos.ReconciliationRecordResponse;
import com.fintech.payment.dto.response.OpsDtos.ReconciliationRunSummaryResponse;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.entity.ReconciliationRecord;
import com.fintech.payment.enums.PaymentTransactionStatus;
import com.fintech.payment.event.model.PaymentEvents.*;
import com.fintech.payment.exception.ApiException;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    private final PaymentRepository paymentRepository;
    private final ReconciliationRecordRepository reconciliationRepository;
    private final PaymentService paymentService;
    private final PaymentOutboxService outboxService;
    private final PaymentAuditService auditService;
    private final boolean scheduledEnabled;
    private final long staleThresholdMinutes;

    public ReconciliationService(
            PaymentRepository paymentRepository,
            ReconciliationRecordRepository reconciliationRepository,
            PaymentService paymentService,
            PaymentOutboxService outboxService,
            PaymentAuditService auditService,
            @Value("${payment.reconciliation.enabled:true}") boolean scheduledEnabled,
            @Value("${payment.reconciliation.stale-threshold-minutes:5}") long staleThresholdMinutes) {
        this.paymentRepository = paymentRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.paymentService = paymentService;
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
                new ReconciliationStartedPayload(runId, "RAZORPAY_ORDERS", Instant.now())
        );

        int checked = 0;
        int mismatches = 0;
        int autoResolved = 0;

        List<Payment> staleOrders = paymentRepository.findByStatusInAndUpdatedAtBefore(
                List.of(
                        PaymentTransactionStatus.ORDER_CREATED,
                        PaymentTransactionStatus.PAYMENT_PENDING,
                        PaymentTransactionStatus.AUTHORIZED
                ),
                threshold
        );

        for (Payment payment : staleOrders) {
            checked++;
            if (payment.getRazorpayOrderId() == null) {
                continue;
            }
            try {
                PaymentTransactionStatus before = payment.getStatus();
                var updated = paymentService.syncPaymentStatus(payment.getIdentitySubject(), payment.getPaymentId(), true);
                if (updated.status() != before) {
                    autoResolved++;
                }
            } catch (Exception ex) {
                mismatches++;
                recordDiscrepancy(runId, "PAYMENT_ORDER", payment.getPaymentId(), payment.getRazorpayOrderId(),
                        payment.getStatus().name(), "UNKNOWN", payment.getAmount(),
                        "PROVIDER_SYNC_FAILED");
                log.warn("Reconciliation sync failed for paymentId={}: {}", payment.getPaymentId(), ex.getMessage());
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
                new ReconciliationCompletedPayload(runId, checked, mismatches, completedAt)
        );
        auditService.record(actorId, "SYSTEM", "RECONCILIATION_RUN", "ReconciliationRun", runId,
                "checked=" + checked + ", autoResolved=" + autoResolved + ", mismatches=" + mismatches);

        return new ReconciliationRunSummaryResponse(runId, 0, checked, 0, mismatches, autoResolved, completedAt);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReconciliationRecordResponse> listDiscrepancies(String resolutionStatus, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), PaymentConstants.MAX_PAGE_SIZE);
        Page<ReconciliationRecord> result = (resolutionStatus != null && !resolutionStatus.isBlank())
                ? reconciliationRepository.findByResolutionStatusOrderByCreatedAtDesc(
                        resolutionStatus, PageRequest.of(Math.max(page, 0), safeSize))
                : reconciliationRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), safeSize));
        List<ReconciliationRecordResponse> items = result.getContent().stream().map(this::toResponse).toList();
        return new PagedResponse<>(items, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.hasNext());
    }

    @Transactional
    public ReconciliationRecordResponse resolveDiscrepancy(
            String actorId, String reconciliationId, ResolveReconciliationRequest request) {
        ReconciliationRecord record = reconciliationRepository.findByReconciliationId(reconciliationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "RECONCILIATION_NOT_FOUND",
                        "Reconciliation record not found: " + reconciliationId));
        record.setResolutionStatus(request.resolutionStatus());
        record.setNotes(request.notes());
        record.setResolvedBy(actorId);
        record.setResolvedAt(Instant.now());
        record = reconciliationRepository.save(record);
        auditService.record(actorId, "OPERATIONS", "RECONCILIATION_RESOLVED",
                "ReconciliationRecord", reconciliationId, request.resolutionStatus());
        return toResponse(record);
    }

    private void recordDiscrepancy(
            String runId, String targetType, String targetId, String providerRef,
            String internalStatus, String providerStatus, java.math.BigDecimal amount, String discrepancyType) {
        String recId = "REC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        ReconciliationRecord rec = new ReconciliationRecord();
        rec.setReconciliationId(recId);
        rec.setRunId(runId);
        rec.setTargetType(targetType);
        rec.setTargetId(targetId);
        rec.setProviderRef(providerRef);
        rec.setInternalStatus(internalStatus);
        rec.setProviderStatus(providerStatus);
        rec.setExpectedAmount(amount);
        rec.setDiscrepancyType(discrepancyType);
        rec.setResolutionStatus("OPEN");
        reconciliationRepository.save(rec);

        outboxService.enqueueEvent(
                PaymentConstants.TOPIC_RECONCILIATION_EVENTS,
                recId,
                "ReconciliationRecord",
                PaymentConstants.EVT_RECONCILIATION_MISMATCH_DETECTED,
                null,
                providerRef,
                new ReconciliationMismatchDetectedPayload(
                        recId, runId, targetType, targetId, discrepancyType,
                        internalStatus, providerStatus, Instant.now())
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
