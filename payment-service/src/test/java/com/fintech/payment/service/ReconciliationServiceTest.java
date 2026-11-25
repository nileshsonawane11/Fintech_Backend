package com.fintech.payment.service;

import com.fintech.payment.dto.response.OpsDtos.ReconciliationRunSummaryResponse;
import com.fintech.payment.entity.IncomingPayment;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.provider.IncomingCollectionProvider;
import com.fintech.payment.provider.PayoutProvider;
import com.fintech.payment.provider.model.ProviderModels.PayoutResult;
import com.fintech.payment.repository.IncomingPaymentRepository;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.repository.ReconciliationRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private IncomingPaymentRepository incomingPaymentRepository;
    @Mock private ReconciliationRecordRepository reconciliationRepository;
    @Mock private PayoutProvider payoutProvider;
    @Mock private IncomingCollectionProvider collectionProvider;
    @Mock private PaymentService paymentService;
    @Mock private IncomingPaymentService incomingPaymentService;
    @Mock private PaymentOutboxService outboxService;
    @Mock private PaymentAuditService auditService;

    private ReconciliationService reconciliationService;

    @BeforeEach
    void setUp() {
        reconciliationService = new ReconciliationService(
                paymentRepository, incomingPaymentRepository, reconciliationRepository,
                payoutProvider, collectionProvider, paymentService, incomingPaymentService,
                outboxService, auditService, true, 5L);
    }

    @Test
    void detectsAmountMismatchAndMissingProviderReferenceAndUpdatesStalePayouts() {
        Payment missingRef = new Payment();
        missingRef.setPaymentId("PAY-TIMEOUT");
        missingRef.setStatus("UNKNOWN_PENDING_RECONCILIATION");
        missingRef.setAmount(new BigDecimal("1000.00"));

        Payment amountMismatch = new Payment();
        amountMismatch.setPaymentId("PAY-MISMATCH");
        amountMismatch.setStatus("PROCESSING");
        amountMismatch.setProviderPayoutId("pout_mismatch");
        amountMismatch.setAmount(new BigDecimal("1000.00"));

        IncomingPayment discrepancyIncoming = new IncomingPayment();
        discrepancyIncoming.setIncomingPaymentId("INP-DISC");
        discrepancyIncoming.setProviderPaymentId("pay_disc");
        discrepancyIncoming.setStatus("DISCREPANCY");
        discrepancyIncoming.setAmount(new BigDecimal("500.00"));
        discrepancyIncoming.setFailureReason("Amount mismatch");

        when(paymentRepository.findByStatusInAndUpdatedAtBefore(anyList(), any()))
                .thenReturn(List.of(missingRef, amountMismatch));
        when(incomingPaymentRepository.findByStatusInAndUpdatedAtBefore(anyList(), any()))
                .thenReturn(List.of(discrepancyIncoming));
        when(payoutProvider.isPayoutAvailable()).thenReturn(true);
        when(payoutProvider.fetchPayout("pout_mismatch")).thenReturn(new PayoutResult(
                "pout_mismatch", "fa_1", "processed", new BigDecimal("999.00"), "INR", "IMPS",
                "UTR1", null, null, null, null, null, false));

        ReconciliationRunSummaryResponse summary = reconciliationService.runReconciliation("ops-1");

        assertEquals(2, summary.outgoingChecked());
        assertEquals(1, summary.incomingChecked());
        assertEquals(3, summary.mismatchesDetected());
        verify(reconciliationRepository, times(3)).save(any());
        verify(outboxService, times(3)).enqueueEvent(any(), any(), any(),
                eq("ReconciliationMismatchDetected"), any(), any(), any());
    }
}
