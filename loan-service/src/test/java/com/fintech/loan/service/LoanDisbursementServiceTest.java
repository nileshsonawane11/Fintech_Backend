package com.fintech.loan.service;

import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.CustomerServiceClient;
import com.fintech.loan.client.LedgerServiceClient;
import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.client.dto.LedgerDtos.LedgerPostingResponseDto;
import com.fintech.loan.client.dto.LedgerDtos.MultiLinePostingRequest;
import com.fintech.loan.entity.*;
import com.fintech.loan.enums.DisbursementStatus;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.ProductStatus;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanDisbursementServiceTest {

    @Mock private LoanDisbursementRepository disbursementRepository;
    @Mock private LoanAccountRepository loanAccountRepository;
    @Mock private LoanApplicationRepository applicationRepository;
    @Mock private LoanRepaymentReconciliationRepository reconciliationRepository;
    @Mock private AccountServiceClient accountServiceClient;
    @Mock private CustomerServiceClient customerServiceClient;
    @Mock private LedgerServiceClient ledgerServiceClient;
    @Mock private LoanProductService productService;
    @Mock private LoanRepaymentScheduleRepository scheduleRepository;
    @Mock private LoanScheduleVersionRepository scheduleVersionRepository;

    private LoanDisbursementService disbursementService;
    private LoanProduct homeLoan;

    @BeforeEach
    void setUp() {
        LoanFinancialCalculator calculator = new LoanFinancialCalculator();
        RepaymentScheduleService scheduleService = new RepaymentScheduleService(
                loanAccountRepository, scheduleRepository, scheduleVersionRepository, calculator, null);

        disbursementService = new LoanDisbursementService(
                disbursementRepository, loanAccountRepository, applicationRepository,
                reconciliationRepository, accountServiceClient, customerServiceClient,
                ledgerServiceClient, productService, scheduleService, calculator
        );

        homeLoan = new LoanProduct();
        homeLoan.setId(UUID.randomUUID());
        homeLoan.setProductCode("HOME_LOAN");
        homeLoan.setStatus(ProductStatus.ACTIVE);
        homeLoan.setInterestCalculationMethod(InterestCalculationMethod.REDUCING_BALANCE);
    }

    @Test
    void disbursementUsesApprovedAmountWhenDifferentFromRequestedAmountAndPostsLedger() {
        LoanApplication app = baseApp("LN-APP-1", new BigDecimal("500000.00"), new BigDecimal("450000.00"));
        LoanOffer offer = baseOffer("OFFER-1", "LN-APP-1", new BigDecimal("450000.00"));

        when(disbursementRepository.findByLoanApplicationId("LN-APP-1")).thenReturn(Optional.empty());
        when(disbursementRepository.findByIdempotencyKey("IDEMP-1")).thenReturn(Optional.empty());
        when(accountServiceClient.validateDisbursementAccount("ACC-101", "sub-1", "CUS-1", "INR"))
                .thenReturn(new InternalAccountDto("ACC-101", "****0101", "CUS-1", "sub-1", "SAVINGS", "SB", "ACTIVE", "INR", Instant.now()));
        when(disbursementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerServiceClient.postBatch(anyString(), any(MultiLinePostingRequest.class)))
                .thenReturn(new LedgerPostingResponseDto("TXN-DISB-1", "SUCCESS", new BigDecimal("450000.00"), "INR",
                        "LE-D", "LE-C", List.of("LE-D", "LE-C"), Instant.now()));
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        when(loanAccountRepository.findByLoanApplicationId("LN-APP-1")).thenReturn(Optional.empty());
        when(loanAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(scheduleRepository.findByLoanAccountIdOrderByInstallmentNumberAsc(anyString())).thenReturn(List.of());

        var res = disbursementService.executeDisbursement(app, offer, "IDEMP-1", "mgr-1");

        assertTrue(res.newlyDisbursed());
        assertEquals(new BigDecimal("450000.00"), res.loanAccount().getApprovedAmount());
        assertEquals(new BigDecimal("450000.00"), res.loanAccount().getDisbursedAmount());
        assertEquals(new BigDecimal("450000.00"), res.loanAccount().getPrincipalAmount());
        assertEquals(new BigDecimal("450000.00"), res.loanAccount().getOutstandingPrincipal());
        assertEquals(DisbursementStatus.COMPLETED, res.disbursement().getDisbursementStatus());
        assertEquals("TXN-DISB-1", res.disbursement().getLedgerTransactionReference());

        verify(ledgerServiceClient).postBatch(eq(res.disbursement().getDisbursementReference()), any(MultiLinePostingRequest.class));
        verify(scheduleRepository).saveAll(argThat(list -> {
            var items = (List<LoanRepaymentSchedule>) list;
            return items.size() == 120
                    && items.get(0).getOpeningPrincipal().compareTo(new BigDecimal("450000.00")) == 0
                    && items.get(119).getClosingPrincipal().compareTo(BigDecimal.ZERO) == 0;
        }));
    }

    @Test
    void ledgerTimeoutOpensReconciliationAndDoesNotCreateLoanAccount() {
        LoanApplication app = baseApp("LN-APP-2", new BigDecimal("500000.00"), new BigDecimal("450000.00"));
        LoanOffer offer = baseOffer("OFFER-2", "LN-APP-2", new BigDecimal("450000.00"));

        when(disbursementRepository.findByLoanApplicationId("LN-APP-2")).thenReturn(Optional.empty());
        when(disbursementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerServiceClient.postBatch(anyString(), any()))
                .thenThrow(new ApiException(HttpStatus.GATEWAY_TIMEOUT, "LEDGER_SERVICE_TIMEOUT", "Timeout"));

        ApiException ex = assertThrows(ApiException.class,
                () -> disbursementService.executeDisbursement(app, offer, null, "mgr-1"));
        assertEquals("LEDGER_SERVICE_TIMEOUT", ex.getCode());

        verify(reconciliationRepository).save(argThat(r ->
                r.getLoanApplicationId().equals("LN-APP-2")
                        && r.getExpectedAmount().compareTo(new BigDecimal("450000.00")) == 0));
        verify(loanAccountRepository, never()).save(any());
    }

    @Test
    void duplicateDisbursementReturnsExistingResultWithoutDoublePosting() {
        LoanApplication app = baseApp("LN-APP-3", new BigDecimal("500000.00"), new BigDecimal("450000.00"));
        LoanOffer offer = baseOffer("OFFER-3", "LN-APP-3", new BigDecimal("450000.00"));

        LoanDisbursement existingDisb = new LoanDisbursement();
        existingDisb.setDisbursementReference("DISB-EXIST");
        existingDisb.setLoanApplicationId("LN-APP-3");
        existingDisb.setLoanAccountId("LN-EXIST");
        existingDisb.setDisbursementStatus(DisbursementStatus.COMPLETED);

        LoanAccount existingAcc = new LoanAccount();
        existingAcc.setLoanAccountId("LN-EXIST");
        existingAcc.setDisbursedAmount(new BigDecimal("450000.00"));

        when(disbursementRepository.findByLoanApplicationId("LN-APP-3")).thenReturn(Optional.of(existingDisb));
        when(loanAccountRepository.findByLoanAccountId("LN-EXIST")).thenReturn(Optional.of(existingAcc));

        var res = disbursementService.executeDisbursement(app, offer, "IDEMP-3", "mgr-1");
        assertFalse(res.newlyDisbursed());
        assertEquals("LN-EXIST", res.loanAccount().getLoanAccountId());
        verifyNoInteractions(ledgerServiceClient);
    }

    @Test
    void historicalDisbursedAnomalyDetectionAndSafeRepair() {
        LoanApplication broken = baseApp("LN-APP-OLD", new BigDecimal("500000.00"), new BigDecimal("450000.00"));
        broken.setStatus("DISBURSED");

        LoanAccount mismatched = new LoanAccount();
        mismatched.setLoanAccountId("LN-OLD-1");
        mismatched.setLoanApplicationId("LN-APP-OLD");
        mismatched.setPrincipalAmount(new BigDecimal("500000.00"));
        mismatched.setTotalPrincipalRepaid(BigDecimal.ZERO);

        when(applicationRepository.findAll()).thenReturn(List.of(broken));
        when(loanAccountRepository.findByLoanApplicationId("LN-APP-OLD")).thenReturn(Optional.of(mismatched));
        when(disbursementRepository.findByLoanApplicationId("LN-APP-OLD")).thenReturn(Optional.empty());

        List<Map<String, Object>> anomalies = disbursementService.getHistoricalDisbursementAnomalies();
        assertEquals(2, anomalies.size());

        when(applicationRepository.findByLoanApplicationId("LN-APP-OLD")).thenReturn(Optional.of(broken));
        when(loanAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        Map<String, Object> repair = disbursementService.repairHistoricalDisbursedApplication("LN-APP-OLD", "admin-1");
        assertEquals("REPAIRED_METADATA", repair.get("status"));
        assertEquals(new BigDecimal("450000.00"), mismatched.getDisbursedAmount());
        assertEquals(new BigDecimal("450000.00"), mismatched.getOutstandingPrincipal());
    }

    private LoanApplication baseApp(String appId, BigDecimal requested, BigDecimal approved) {
        LoanApplication app = new LoanApplication();
        app.setLoanApplicationId(appId);
        app.setCustomerId("CUS-1");
        app.setIdentitySubject("sub-1");
        app.setProductCode("HOME_LOAN");
        app.setRequestedAmount(requested);
        app.setApprovedAmount(approved);
        app.setApprovedInterestRate(new BigDecimal("8.50"));
        app.setApprovedTenureMonths(120);
        app.setTenureMonths(120);
        app.setCurrency("INR");
        app.setDisbursementAccountId("ACC-101");
        return app;
    }

    private LoanOffer baseOffer(String offerId, String appId, BigDecimal sanctioned) {
        LoanOffer o = new LoanOffer();
        o.setOfferId(offerId);
        o.setLoanApplicationId(appId);
        o.setSanctionedAmount(sanctioned);
        o.setInterestRate(new BigDecimal("8.50"));
        o.setTenureMonths(120);
        o.setDisbursementAccountId("ACC-101");
        return o;
    }
}
