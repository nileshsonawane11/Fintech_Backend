package com.fintech.payment.service;

import com.fintech.payment.dto.response.OpsDtos.ReconciliationRunSummaryResponse;
import com.fintech.payment.dto.response.PaymentTransactionResponse;
import com.fintech.payment.entity.Payment;
import com.fintech.payment.enums.PaymentPurpose;
import com.fintech.payment.enums.PaymentTransactionStatus;
import com.fintech.payment.repository.PaymentRepository;
import com.fintech.payment.repository.ReconciliationRecordRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private ReconciliationRecordRepository reconciliationRepository;
    @Mock private PaymentService paymentService;
    @Mock private PaymentOutboxService outboxService;
    @Mock private PaymentAuditService auditService;

    @Test
    void runReconciliation_syncsPendingOrders() {
        ReconciliationService service = new ReconciliationService(
                paymentRepository, reconciliationRepository, paymentService, outboxService, auditService, true, 5);

        Payment pending = new Payment();
        pending.setPaymentId("PAY-1");
        pending.setIdentitySubject("sub-1");
        pending.setRazorpayOrderId("order_1");
        pending.setStatus(PaymentTransactionStatus.ORDER_CREATED);
        pending.setAmount(new BigDecimal("500.0000"));
        pending.setCurrency("INR");

        when(paymentRepository.findByStatusInAndUpdatedAtBefore(anyList(), any(Instant.class)))
                .thenReturn(List.of(pending));
        when(paymentService.syncPaymentStatus("sub-1", "PAY-1", true))
                .thenReturn(new PaymentTransactionResponse(
                        "PAY-1", "sub-1", null, "ACC-1", PaymentPurpose.ACCOUNT_DEPOSIT, "ACC-1",
                        new BigDecimal("500.0000"), BigDecimal.ZERO, "INR", PaymentTransactionStatus.PROCESSING,
                        "order_1", "pay_1", false, "upi", null, null, null, null,
                        Instant.now(), null, Instant.now(), Instant.now()));

        ReconciliationRunSummaryResponse summary = service.runReconciliation("SYSTEM");

        assertEquals(1, summary.incomingChecked());
        assertEquals(1, summary.autoResolvedCount());
        assertEquals(0, summary.mismatchesDetected());
    }
}
