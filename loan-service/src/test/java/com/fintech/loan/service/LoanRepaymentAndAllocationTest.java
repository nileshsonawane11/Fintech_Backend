package com.fintech.loan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.LedgerServiceClient;
import com.fintech.loan.client.PaymentServiceClient;
import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.client.dto.LedgerDtos.*;
import com.fintech.loan.client.dto.PaymentDtos.*;
import com.fintech.loan.dto.request.RepaymentRequests.*;
import com.fintech.loan.dto.response.RepaymentResponses.*;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.*;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.mapper.RepaymentMapper;
import com.fintech.loan.repository.*;
import com.fintech.loan.scheduler.AutoCollectionScheduler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanRepaymentAndAllocationTest {

    @Mock private LoanAccountRepository loanAccountRepository;
    @Mock private LoanRepaymentScheduleRepository scheduleRepository;
    @Mock private LoanScheduleVersionRepository scheduleVersionRepository;
    @Mock private LoanRepaymentRepository repaymentRepository;
    @Mock private LoanRepaymentAttemptRepository attemptRepository;
    @Mock private LoanRepaymentAllocationRepository allocationRepository;
    @Mock private LoanChargeRepository chargeRepository;
    @Mock private LoanRepaymentAccountRepository repaymentAccountRepository;
    @Mock private LoanRepaymentMandateRepository mandateRepository;
    @Mock private LoanRepaymentReconciliationRepository reconciliationRepository;
    @Mock private LoanWebhookEventRepository webhookEventRepository;
    @Mock private LoanProductFeeRepository feeRepository;
    @Mock private LoanProductService productService;
    @Mock private AccountServiceClient accountServiceClient;
    @Mock private LedgerServiceClient ledgerServiceClient;
    @Mock private PaymentServiceClient paymentServiceClient;
    @Mock private LoanOutboxService outboxService;
    @Mock private LoanNotificationService notificationService;

    private LoanAccountAccessHelper accessHelper;
    private RepaymentAccountService repaymentAccountService;
    private RepaymentMandateService mandateService;
    private PaymentAllocationService allocationService;
    private LoanRepaymentService repaymentService;
    private PrepaymentForeclosureService prepaymentForeclosureService;
    private OverdueAndChargeService overdueAndChargeService;
    private LoanWebhookService webhookService;
    private AutoCollectionScheduler autoCollectionScheduler;
    private RepaymentMapper mapper;

    private LoanAccount activeLoan;
    private LoanProduct homeLoan;

    @BeforeEach
    void setUp() {
        mapper = new RepaymentMapper();
        accessHelper = new LoanAccountAccessHelper(loanAccountRepository);
        repaymentAccountService = new RepaymentAccountService(
                accessHelper, accountServiceClient, repaymentAccountRepository,
                mandateRepository, repaymentRepository, mapper);
        mandateService = new RepaymentMandateService(
                accessHelper, repaymentAccountService, paymentServiceClient,
                mandateRepository, outboxService, notificationService, mapper);
        allocationService = new PaymentAllocationService(
                scheduleRepository, chargeRepository, allocationRepository, loanAccountRepository);
        repaymentService = new LoanRepaymentService(
                accessHelper, loanAccountRepository, scheduleRepository, repaymentRepository,
                attemptRepository, chargeRepository, reconciliationRepository,
                repaymentAccountService, accountServiceClient, ledgerServiceClient,
                paymentServiceClient, allocationService, outboxService, notificationService, mapper);

        LoanFinancialCalculator calculator = new LoanFinancialCalculator();
        RepaymentScheduleService scheduleService = new RepaymentScheduleService(
                loanAccountRepository, scheduleRepository, scheduleVersionRepository, calculator, outboxService);
        prepaymentForeclosureService = new PrepaymentForeclosureService(
                accessHelper, loanAccountRepository, productService, feeRepository,
                chargeRepository, scheduleRepository, repaymentService, scheduleService, outboxService);
        overdueAndChargeService = new OverdueAndChargeService(
                scheduleRepository, loanAccountRepository, chargeRepository,
                productService, feeRepository, accessHelper, outboxService, notificationService);
        webhookService = new LoanWebhookService(
                webhookEventRepository, repaymentService, mandateService,
                new ObjectMapper(), "finbank-webhook-secret");
        LoanReconciliationService reconService = new LoanReconciliationService(
                repaymentRepository, scheduleRepository, attemptRepository, reconciliationRepository,
                loanAccountRepository, ledgerServiceClient, paymentServiceClient, repaymentService, mapper);
        autoCollectionScheduler = new AutoCollectionScheduler(
                scheduleRepository, loanAccountRepository, mandateRepository, repaymentRepository,
                repaymentService, overdueAndChargeService, reconService, accessHelper, outboxService, notificationService);

        activeLoan = new LoanAccount();
        activeLoan.setLoanAccountId("LN-1001");
        activeLoan.setLoanApplicationId("LN-APP-1001");
        activeLoan.setCustomerId("CUS-1");
        activeLoan.setIdentitySubject("sub-cust-1");
        activeLoan.setProductCode("HOME_LOAN");
        activeLoan.setApprovedAmount(new BigDecimal("1000000.00"));
        activeLoan.setDisbursedAmount(new BigDecimal("1000000.00"));
        activeLoan.setPrincipalAmount(new BigDecimal("1000000.00"));
        activeLoan.setOutstandingPrincipal(new BigDecimal("1000000.00"));
        activeLoan.setInterestRate(new BigDecimal("8.35"));
        activeLoan.setTenureMonths(120);
        activeLoan.setCurrency("INR");
        activeLoan.setEmiAmount(new BigDecimal("12320.00"));
        activeLoan.setDisbursementDate(LocalDate.now().minusMonths(1));
        activeLoan.setStatus("ACTIVE");

        homeLoan = new LoanProduct();
        homeLoan.setId(UUID.randomUUID());
        homeLoan.setProductCode("HOME_LOAN");
        homeLoan.setStatus(ProductStatus.ACTIVE);
        homeLoan.setInterestCalculationMethod(InterestCalculationMethod.REDUCING_BALANCE);
    }

    @Test
    void partialEmiPaymentMarksInstallmentPartiallyPaidAndPreservesRemainingAmount() {
        LoanRepaymentSchedule inst = sampleInstallment("INST-LN-1001-1", 1, new BigDecimal("10000.00"), new BigDecimal("6690.00"));
        LoanRepaymentAccount repAcc = sampleRepaymentAccount("RPA-1", "ACC-SAV-1");

        when(repaymentRepository.findByIdempotencyKey("IDEMP-PART-1")).thenReturn(Optional.empty());
        when(loanAccountRepository.findWithLockByLoanAccountId("LN-1001")).thenReturn(Optional.of(activeLoan));
        when(repaymentAccountRepository.findByRepaymentAccountId("RPA-1")).thenReturn(Optional.of(repAcc));
        when(accountServiceClient.validateRepaymentAccount("ACC-SAV-1", "sub-cust-1", "CUS-1", "INR"))
                .thenReturn(new InternalAccountDto("ACC-SAV-1", "****1111", "CUS-1", "sub-cust-1", "SAVINGS", "SB", "ACTIVE", "INR", Instant.now()));
        when(ledgerServiceClient.getAccountBalance("ACC-SAV-1"))
                .thenReturn(new LedgerBalanceDto("ACC-SAV-1", new BigDecimal("50000.00"), new BigDecimal("50000.00"), "INR"));
        when(chargeRepository.findByLoanAccountIdAndStatusInOrderByAssessedDateAsc(eq("LN-1001"), anyCollection()))
                .thenReturn(List.of());
        when(scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(eq("LN-1001"), anyCollection()))
                .thenReturn(List.of(inst));
        when(repaymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(attemptRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerServiceClient.postBatch(anyString(), any())).thenReturn(
                new LedgerPostingResponseDto("TXN-PAY-1", "SUCCESS", new BigDecimal("10000.00"), "INR",
                        "LE-D", "LE-C", List.of("LE-D", "LE-C"), Instant.now()));
        when(scheduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(loanAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RepaymentResponse res = repaymentService.initiateManualRepayment(
                "LN-1001",
                new ManualRepaymentRequest("INST-LN-1001-1", "RPA-1", RepaymentMethod.INTERNAL_ACCOUNT, new BigDecimal("10000.00"), null),
                "IDEMP-PART-1",
                "sub-cust-1"
        );

        assertEquals(RepaymentStatus.SUCCESS, res.repaymentStatus());
        assertEquals(InstallmentStatus.PARTIALLY_PAID, inst.getStatus());
        assertEquals(new BigDecimal("10000.00"), inst.getPaidAmount());
        assertEquals(new BigDecimal("6690.00"), inst.getRemainingAmount());
        assertNotNull(res.receiptReference());
    }

    @Test
    void insufficientBalanceFailsRepaymentAndLeavesInstallmentUnpaid() {
        LoanRepaymentAccount repAcc = sampleRepaymentAccount("RPA-1", "ACC-SAV-1");

        when(repaymentRepository.findByIdempotencyKey("IDEMP-INSUFF")).thenReturn(Optional.empty());
        when(loanAccountRepository.findWithLockByLoanAccountId("LN-1001")).thenReturn(Optional.of(activeLoan));
        when(repaymentAccountRepository.findByRepaymentAccountId("RPA-1")).thenReturn(Optional.of(repAcc));
        when(ledgerServiceClient.getAccountBalance("ACC-SAV-1"))
                .thenReturn(new LedgerBalanceDto("ACC-SAV-1", new BigDecimal("500.00"), new BigDecimal("500.00"), "INR"));
        when(repaymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(attemptRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ApiException ex = assertThrows(ApiException.class, () -> repaymentService.initiateManualRepayment(
                "LN-1001",
                new ManualRepaymentRequest("INST-LN-1001-1", "RPA-1", RepaymentMethod.INTERNAL_ACCOUNT, new BigDecimal("16690.00"), null),
                "IDEMP-INSUFF",
                "sub-cust-1"
        ));
        assertEquals("INSUFFICIENT_BALANCE", ex.getCode());
        verify(ledgerServiceClient, never()).postBatch(any(), any());
        verify(scheduleRepository, never()).save(any());
    }

    @Test
    void ledgerFailureAfterBalanceCheckOpensReconciliationWithoutMarkingSuccess() {
        LoanRepaymentSchedule inst = sampleInstallment("INST-LN-1001-1", 1, new BigDecimal("10000.00"), new BigDecimal("6690.00"));
        LoanRepaymentAccount repAcc = sampleRepaymentAccount("RPA-1", "ACC-SAV-1");

        when(loanAccountRepository.findWithLockByLoanAccountId("LN-1001")).thenReturn(Optional.of(activeLoan));
        when(repaymentAccountRepository.findByRepaymentAccountId("RPA-1")).thenReturn(Optional.of(repAcc));
        when(ledgerServiceClient.getAccountBalance("ACC-SAV-1"))
                .thenReturn(new LedgerBalanceDto("ACC-SAV-1", new BigDecimal("50000.00"), new BigDecimal("50000.00"), "INR"));
        when(scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(eq("LN-1001"), anyCollection()))
                .thenReturn(List.of(inst));
        when(repaymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(attemptRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerServiceClient.postBatch(anyString(), any()))
                .thenThrow(new ApiException(HttpStatus.GATEWAY_TIMEOUT, "LEDGER_SERVICE_TIMEOUT", "Timeout"));

        assertThrows(ApiException.class, () -> repaymentService.initiateManualRepayment(
                "LN-1001",
                new ManualRepaymentRequest("INST-LN-1001-1", "RPA-1", RepaymentMethod.INTERNAL_ACCOUNT, new BigDecimal("16690.00"), null),
                "IDEMP-TIMEOUT",
                "sub-cust-1"
        ));
        verify(reconciliationRepository).save(argThat(r ->
                r.getReconciliationType() == ReconciliationType.REPAYMENT_DEBIT_SUCCESS_LEDGER_FAILED));
        assertEquals(InstallmentStatus.DUE, inst.getStatus());
    }

    @Test
    void externalPaymentRemainsPendingUntilSignedWebhookSettlesAndDeduplicatesRepeatWebhook() throws Exception {
        LoanRepaymentSchedule inst = sampleInstallment("INST-LN-1001-1", 1, new BigDecimal("10000.00"), new BigDecimal("6690.00"));

        when(loanAccountRepository.findWithLockByLoanAccountId("LN-1001")).thenReturn(Optional.of(activeLoan));
        when(repaymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(attemptRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentServiceClient.initiateCollection(anyString(), any())).thenReturn(
                new CollectionOrderResponse("COL-EXT-1", "RPY-1", "RAZORPAY", "RZP-COL-1", "UPI",
                        new BigDecimal("16690.00"), "INR", "PENDING", null, null, null, Instant.now(), Instant.now()));

        RepaymentResponse initRes = repaymentService.initiateManualRepayment(
                "LN-1001",
                new ManualRepaymentRequest("INST-LN-1001-1", null, RepaymentMethod.UPI, new BigDecimal("16690.00"), "user@upi"),
                "IDEMP-UPI-1",
                "sub-cust-1"
        );
        assertEquals(RepaymentStatus.PENDING, initRes.repaymentStatus());
        assertNull(initRes.receiptReference());

        // Now deliver signed webhook
        LoanRepayment stored = new LoanRepayment();
        stored.setRepaymentId(initRes.repaymentId());
        stored.setRepaymentReference(initRes.repaymentReference());
        stored.setLoanAccountId("LN-1001");
        stored.setCustomerId("CUS-1");
        stored.setIdentitySubject("sub-cust-1");
        stored.setInstallmentId("INST-LN-1001-1");
        stored.setPaymentMethod(RepaymentMethod.UPI);
        stored.setAmount(new BigDecimal("16690.00"));
        stored.setCurrency("INR");
        stored.setRepaymentStatus(RepaymentStatus.PENDING);
        stored.setPaymentReference("COL-EXT-1");

        when(webhookEventRepository.existsByProviderAndEventId("RAZORPAY", "EVT-WH-1")).thenReturn(false).thenReturn(true);
        when(repaymentRepository.findByPaymentReference("COL-EXT-1")).thenReturn(Optional.of(stored));
        when(scheduleRepository.findByLoanAccountIdAndStatusInOrderByInstallmentNumberAsc(eq("LN-1001"), anyCollection()))
                .thenReturn(List.of(inst));
        when(ledgerServiceClient.postBatch(anyString(), any())).thenReturn(
                new LedgerPostingResponseDto("TXN-UPI-1", "SUCCESS", new BigDecimal("16690.00"), "INR",
                        "LE-D", "LE-C", List.of("LE-D", "LE-C"), Instant.now()));

        byte[] payload = "{\"event\":\"payment.captured\",\"collectionReference\":\"COL-EXT-1\",\"providerReference\":\"RZP-COL-1\"}"
                .getBytes(StandardCharsets.UTF_8);
        String sig = hmacSha256("finbank-webhook-secret", payload);

        Map<String, Object> first = webhookService.processPaymentWebhook("razorpay", sig, "EVT-WH-1", payload);
        assertEquals("PROCESSED", first.get("status"));
        assertEquals(RepaymentStatus.SUCCESS, stored.getRepaymentStatus());
        assertEquals(InstallmentStatus.PAID, inst.getStatus());

        Map<String, Object> duplicate = webhookService.processPaymentWebhook("razorpay", sig, "EVT-WH-1", payload);
        assertEquals("DUPLICATE_IGNORED", duplicate.get("status"));
    }

    @Test
    void externalMandateStartsPendingAndBlockingAccountRemovalEnforced() {
        when(loanAccountRepository.findByLoanAccountId("LN-1001")).thenReturn(Optional.of(activeLoan));
        when(paymentServiceClient.registerMandate(anyString(), any())).thenReturn(
                new MandateRegistrationResponse("MND-1", "RZP-MND-1", "UPI_AUTOPAY", "RAZORPAY",
                        new BigDecimal("25000.00"), "MONTHLY", LocalDate.now(), LocalDate.now().plusYears(5),
                        "PENDING", null, Instant.now(), Instant.now()));
        when(mandateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MandateResponse res = mandateService.createMandate(
                "LN-1001",
                new CreateMandateRequest(MandateType.UPI_AUTOPAY, null, new BigDecimal("25000.00"),
                        RepaymentFrequency.MONTHLY, LocalDate.now(), LocalDate.now().plusYears(5)),
                "IDEMP-MND-1",
                "sub-cust-1"
        );
        assertEquals(MandateStatus.PENDING, res.status());

        // Block removing repayment account with active mandate
        LoanRepaymentAccount repAcc = sampleRepaymentAccount("RPA-1", "ACC-SAV-1");
        when(repaymentAccountRepository.findByRepaymentAccountId("RPA-1")).thenReturn(Optional.of(repAcc));
        when(mandateRepository.existsByRepaymentAccountIdAndStatusIn(eq("RPA-1"), anyCollection())).thenReturn(true);

        ApiException blocked = assertThrows(ApiException.class,
                () -> repaymentAccountService.deactivateRepaymentAccount("LN-1001", "RPA-1", "sub-cust-1"));
        assertEquals("ACTIVE_MANDATE_EXISTS", blocked.getCode());
    }

    @Test
    void overdueEvaluationAppliesContractualLatePenaltyAfterGracePeriod() {
        LoanRepaymentSchedule overdueInst = sampleInstallment("INST-LN-1001-1", 1, new BigDecimal("10000.00"), new BigDecimal("6690.00"));
        overdueInst.setDueDate(LocalDate.now().minusDays(10));
        overdueInst.setGracePeriodEndDate(LocalDate.now().minusDays(5));

        LoanProductFee fee = new LoanProductFee();
        fee.setLatePaymentPenalty(new BigDecimal("2.00"));

        when(scheduleRepository.findByDueDateLessThanEqualAndStatusInOrderByDueDateAsc(any(), anyCollection()))
                .thenReturn(List.of(overdueInst));
        when(loanAccountRepository.findByLoanAccountId("LN-1001")).thenReturn(Optional.of(activeLoan));
        when(chargeRepository.existsByInstallmentIdAndChargeType("INST-LN-1001-1", LoanChargeType.LATE_PAYMENT_PENALTY))
                .thenReturn(false);
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        when(feeRepository.findByProductId(homeLoan.getId())).thenReturn(Optional.of(fee));

        int count = overdueAndChargeService.evaluateOverdueInstallments(LocalDate.now());
        assertEquals(1, count);
        assertEquals(InstallmentStatus.OVERDUE, overdueInst.getStatus());
        assertEquals(10, activeLoan.getDpd());
        verify(chargeRepository).save(argThat(c -> c.getAmount().compareTo(new BigDecimal("333.80")) == 0));
    }

    @Test
    void foreclosureClosesLoanOnlyAfterLedgerConfirmation() {
        when(loanAccountRepository.findWithLockByLoanAccountId("LN-1001")).thenReturn(Optional.of(activeLoan));
        when(loanAccountRepository.findByLoanAccountId("LN-1001")).thenReturn(Optional.of(activeLoan));
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        LoanProductFee nilFee = new LoanProductFee();
        nilFee.setForeclosureChargePercentage(BigDecimal.ZERO);
        when(feeRepository.findByProductId(homeLoan.getId())).thenReturn(Optional.of(nilFee));

        LoanRepaymentAccount repAcc = sampleRepaymentAccount("RPA-1", "ACC-SAV-1");
        when(repaymentAccountRepository.findByRepaymentAccountId("RPA-1")).thenReturn(Optional.of(repAcc));
        when(ledgerServiceClient.getAccountBalance("ACC-SAV-1"))
                .thenReturn(new LedgerBalanceDto("ACC-SAV-1", new BigDecimal("2000000.00"), new BigDecimal("2000000.00"), "INR"));
        when(repaymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(attemptRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerServiceClient.postBatch(anyString(), any())).thenReturn(
                new LedgerPostingResponseDto("TXN-FORE-1", "SUCCESS", new BigDecimal("1006863.01"), "INR",
                        "LE-D", "LE-C", List.of("LE-D", "LE-C"), Instant.now()));

        RepaymentResponse res = prepaymentForeclosureService.executeForeclosure(
                "LN-1001",
                new ExecuteForeclosureRequest(RepaymentMethod.INTERNAL_ACCOUNT, "RPA-1", LocalDate.now(), null),
                "IDEMP-FORE-1",
                "sub-cust-1"
        );

        assertEquals(RepaymentStatus.SUCCESS, res.repaymentStatus());
        assertEquals("CLOSED", activeLoan.getStatus());
        assertEquals(0, activeLoan.getOutstandingPrincipal().compareTo(BigDecimal.ZERO));
    }

    @Test
    void autoCollectionSkipsDuplicateInFlightInstallment() {
        LoanRepaymentSchedule inst = sampleInstallment("INST-LN-1001-1", 1, new BigDecimal("10000.00"), new BigDecimal("6690.00"));
        when(repaymentRepository.existsByInstallmentIdAndRepaymentStatusIn(eq("INST-LN-1001-1"), anyCollection()))
                .thenReturn(true);

        boolean triggered = autoCollectionScheduler.collectInstallmentIfEligible(inst, LocalDate.now());
        assertFalse(triggered);
        verifyNoInteractions(ledgerServiceClient, paymentServiceClient);
    }

    private LoanRepaymentSchedule sampleInstallment(String id, int num, BigDecimal principal, BigDecimal interest) {
        LoanRepaymentSchedule s = new LoanRepaymentSchedule();
        s.setId(UUID.randomUUID());
        s.setInstallmentId(id);
        s.setLoanAccountId("LN-1001");
        s.setInstallmentNumber(num);
        s.setDueDate(LocalDate.now());
        s.setPrincipalAmount(principal);
        s.setInterestAmount(interest);
        s.setTotalAmount(principal.add(interest));
        s.setPaidAmount(BigDecimal.ZERO);
        s.setRemainingAmount(principal.add(interest));
        s.setStatus(InstallmentStatus.DUE);
        return s;
    }

    private LoanRepaymentAccount sampleRepaymentAccount(String repId, String extId) {
        LoanRepaymentAccount a = new LoanRepaymentAccount();
        a.setRepaymentAccountId(repId);
        a.setLoanAccountId("LN-1001");
        a.setCustomerId("CUS-1");
        a.setIdentitySubject("sub-cust-1");
        a.setExternalAccountId(extId);
        a.setMaskedAccountNumber("****1111");
        a.setAccountType("SAVINGS");
        a.setCurrency("INR");
        a.setPrimary(true);
        a.setStatus(RepaymentAccountStatus.ACTIVE);
        return a;
    }

    private String hmacSha256(String secret, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data));
    }
}
