package com.fintech.loan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.loan.client.AccountServiceClient;
import com.fintech.loan.client.CustomerServiceClient;
import com.fintech.loan.client.dto.CustomerKycContext;
import com.fintech.loan.client.dto.CustomerProfileDto;
import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.client.dto.KycApplicationDto;
import com.fintech.loan.client.dto.KycDocumentDto;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.dto.request.LoanApplicationRequest;
import com.fintech.loan.dto.response.LoanApplicationResponse;
import com.fintech.loan.entity.LoanApplication;
import com.fintech.loan.entity.LoanApplicationOfferSnapshot;
import com.fintech.loan.entity.LoanProduct;
import com.fintech.loan.entity.LoanProductFee;
import com.fintech.loan.enums.DiscountType;
import com.fintech.loan.enums.EmploymentType;
import com.fintech.loan.enums.InterestCalculationMethod;
import com.fintech.loan.enums.LoanCategory;
import com.fintech.loan.enums.ProcessingFeeType;
import com.fintech.loan.enums.ProductStatus;
import com.fintech.loan.event.producer.LoanOutboxService;
import com.fintech.loan.exception.ApiException;
import com.fintech.loan.repository.LoanApplicationHistoryRepository;
import com.fintech.loan.repository.LoanApplicationRepository;
import com.fintech.loan.repository.LoanDocumentRepository;
import com.fintech.loan.repository.LoanIdempotencyKeyRepository;
import com.fintech.loan.repository.LoanOfferRepository;
import com.fintech.loan.repository.LoanProductFeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanApplicationServiceTest {

    @Mock private LoanApplicationRepository applicationRepository;
    @Mock private LoanProductService productService;
    @Mock private LoanProductFeeRepository feeRepository;
    @Mock private LoanApplicationHistoryRepository historyRepository;
    @Mock private LoanDocumentRepository documentRepository;
    @Mock private LoanOfferRepository sanctionedOfferRepository;
    @Mock private DynamicLoanOfferService dynamicOfferService;
    @Mock private LoanIdempotencyKeyRepository idempotencyKeyRepository;
    @Mock private CustomerServiceClient customerServiceClient;
    @Mock private AccountServiceClient accountServiceClient;
    @Mock private LoanOutboxService outboxService;
    @Mock private LoanNotificationService notificationService;

    private LoanApplicationService applicationService;
    private LoanProduct homeLoan;
    private LoanProductFee homeFee;
    private CustomerKycContext verifiedKyc;
    private InternalAccountDto activeSavingsAccount;

    @BeforeEach
    void setUp() {
        LoanFinancialCalculator calculator = new LoanFinancialCalculator();
        LoanIdempotencyService idempotencyService = new LoanIdempotencyService(
                idempotencyKeyRepository, new ObjectMapper().findAndRegisterModules(), 24L);

        applicationService = new LoanApplicationService(
                applicationRepository, productService, feeRepository,
                historyRepository, documentRepository, sanctionedOfferRepository,
                dynamicOfferService, calculator, idempotencyService,
                customerServiceClient, accountServiceClient, outboxService,
                notificationService, LoanConstants.TOPIC_APPLICATION_SUBMITTED
        );

        homeLoan = new LoanProduct();
        homeLoan.setId(UUID.randomUUID());
        homeLoan.setProductCode("HOME_LOAN");
        homeLoan.setProductName("FinEdge Home Loan");
        homeLoan.setLoanCategory(LoanCategory.HOME);
        homeLoan.setStatus(ProductStatus.ACTIVE);
        homeLoan.setCurrency("INR");
        homeLoan.setMinimumLoanAmount(new BigDecimal("500000.00"));
        homeLoan.setMaximumLoanAmount(new BigDecimal("50000000.00"));
        homeLoan.setMinimumInterestRate(new BigDecimal("8.35"));
        homeLoan.setMaximumInterestRate(new BigDecimal("10.15"));
        homeLoan.setInterestCalculationMethod(InterestCalculationMethod.REDUCING_BALANCE);
        homeLoan.setMinimumTenureMonths(60);
        homeLoan.setMaximumTenureMonths(360);
        homeLoan.setMinimumMonthlyIncome(new BigDecimal("40000.00"));
        homeLoan.setMaxFoirPercentage(new BigDecimal("60.00"));
        homeLoan.setMaximumLTVPercentage(new BigDecimal("85.00"));
        homeLoan.setEmploymentTypes(List.of("SALARIED", "SELF_EMPLOYED_PROFESSIONAL"));
        homeLoan.setEligibleLoanPurposes(List.of("Purchase of ready-to-move property"));

        homeFee = new LoanProductFee();
        homeFee.setId(UUID.randomUUID());
        homeFee.setProductId(homeLoan.getId());
        homeFee.setProcessingFeeType(ProcessingFeeType.PERCENTAGE);
        homeFee.setProcessingFeeValue(new BigDecimal("0.40"));
        homeFee.setMinimumProcessingFee(new BigDecimal("5000.00"));
        homeFee.setMaximumProcessingFee(new BigDecimal("25000.00"));

        CustomerProfileDto profile = new CustomerProfileDto(
                "CUS-1001", "Aarav Sharma", LocalDate.of(1992, 5, 10),
                "9876543210", "aarav@finbank.in", "ABCDE1234F", "123456789012",
                "APPROVED", "LOW", Instant.now(), "MALE", List.of()
        );
        KycApplicationDto kycCase = new KycApplicationDto("KYC-001", "CUS-1001", "APPROVED", Instant.now());
        KycDocumentDto panDoc = new KycDocumentDto("DOC-PAN-1", "PAN", "pan.pdf", "application/pdf", 1024L, "VERIFIED", Instant.now());
        verifiedKyc = new CustomerKycContext(profile, kycCase, List.of(panDoc));

        activeSavingsAccount = new InternalAccountDto(
                "ACC-1001", "********1234", "CUS-1001", "sub-user-1",
                "SAVINGS", "SAVINGS_REGULAR", "ACTIVE", "INR", Instant.now()
        );
    }

    @Test
    void applyForLoan_succeedsWithVerifiedKycAccountOfferFoirAndNotifications() {
        LoanApplicationRequest req = baseValidRequest();
        LoanApplicationOfferSnapshot snap = new LoanApplicationOfferSnapshot();
        snap.setId(UUID.randomUUID());
        snap.setOfferId(UUID.randomUUID());
        snap.setOfferCode("HOME_FESTIVE_2026");
        snap.setOfferName("Festive Offer");
        snap.setOfferVersion(1);
        snap.setDiscountType(DiscountType.COMBINED);
        snap.setEffectiveInterestRate(new BigDecimal("8.20"));
        snap.setOriginalProcessingFee(new BigDecimal("10000.00"));
        snap.setDiscountedProcessingFee(new BigDecimal("5000.00"));

        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        when(feeRepository.findByProductId(homeLoan.getId())).thenReturn(Optional.of(homeFee));
        when(customerServiceClient.verifyCustomerAndFetchKyc("sub-user-1")).thenReturn(verifiedKyc);
        when(accountServiceClient.validateDisbursementAccount("ACC-1001", "sub-user-1", "CUS-1001", "INR"))
                .thenReturn(activeSavingsAccount);
        when(dynamicOfferService.evaluateAndSnapshotBestOffer(any(), eq(homeLoan), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Optional.of(snap));
        when(applicationRepository.save(any(LoanApplication.class))).thenAnswer(inv -> inv.getArgument(0));
        when(documentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(sanctionedOfferRepository.findFirstByLoanApplicationIdOrderByCreatedAtDesc(any())).thenReturn(Optional.empty());

        LoanApplicationResponse res = applicationService.applyForLoan(req, "idem-1", "sub-user-1");

        assertNotNull(res.getLoanApplicationId());
        assertEquals("SUBMITTED", res.getStatus());
        assertEquals("CUS-1001", res.getCustomerId());
        assertEquals(new BigDecimal("8.20"), res.getEffectiveInterestRate());
        assertEquals(new BigDecimal("5000.00"), res.getProcessingFeeAmount());
        assertNotNull(res.getIndicativeEmi());
        assertEquals(1, res.getDocuments().size());
        assertEquals(1, res.getHistory().size());

        verify(outboxService).enqueueEvent(eq(LoanConstants.TOPIC_APPLICATION_SUBMITTED),
                eq(res.getLoanApplicationId()), eq("LOAN_APPLICATION"),
                eq(LoanConstants.EVT_APPLICATION_SUBMITTED), any());
        verify(notificationService).notifyCustomer(eq("sub-user-1"), eq("LOAN_APPLICATION_SUBMITTED"),
                anyString(), anyString(), eq(res.getLoanApplicationId()));
        verify(notificationService).notifyRole(eq(LoanConstants.ROLE_LOAN_OFFICER), isNull(),
                eq("NEW_LOAN_APPLICATION_QUEUE"), anyString(), anyString(), eq(res.getLoanApplicationId()));
    }

    @Test
    void applyForLoan_rejectsUnverifiedKyc() {
        LoanApplicationRequest req = baseValidRequest();
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        when(feeRepository.findByProductId(homeLoan.getId())).thenReturn(Optional.of(homeFee));
        when(customerServiceClient.verifyCustomerAndFetchKyc("sub-unverified"))
                .thenThrow(ApiException.forbidden("KYC_NOT_VERIFIED", "KYC is not verified"));

        ApiException ex = assertThrows(ApiException.class,
                () -> applicationService.applyForLoan(req, "idem-kyc", "sub-unverified"));
        assertEquals("KYC_NOT_VERIFIED", ex.getCode());
        assertEquals(HttpStatus.FORBIDDEN, ex.getHttpStatus());
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void applyForLoan_rejectsInvalidCustomer() {
        LoanApplicationRequest req = baseValidRequest();
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        when(feeRepository.findByProductId(homeLoan.getId())).thenReturn(Optional.of(homeFee));
        when(customerServiceClient.verifyCustomerAndFetchKyc("sub-missing"))
                .thenThrow(ApiException.notFound("CUSTOMER_NOT_FOUND", "Customer not found"));

        ApiException ex = assertThrows(ApiException.class,
                () -> applicationService.applyForLoan(req, "idem-cust", "sub-missing"));
        assertEquals("CUSTOMER_NOT_FOUND", ex.getCode());
    }

    @Test
    void applyForLoan_rejectsAccountOwnershipMismatch() {
        LoanApplicationRequest req = baseValidRequest();
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        when(feeRepository.findByProductId(homeLoan.getId())).thenReturn(Optional.of(homeFee));
        when(customerServiceClient.verifyCustomerAndFetchKyc("sub-user-1")).thenReturn(verifiedKyc);
        when(accountServiceClient.validateDisbursementAccount("ACC-1001", "sub-user-1", "CUS-1001", "INR"))
                .thenThrow(ApiException.forbidden("ACCOUNT_OWNERSHIP_MISMATCH", "Account not owned"));

        ApiException ex = assertThrows(ApiException.class,
                () -> applicationService.applyForLoan(req, "idem-acc", "sub-user-1"));
        assertEquals("ACCOUNT_OWNERSHIP_MISMATCH", ex.getCode());
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void applyForLoan_rejectsInvalidDisbursementAccount() {
        LoanApplicationRequest req = baseValidRequest();
        req.setDisbursementAccountNumber("ACC-UNKNOWN");
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        when(feeRepository.findByProductId(homeLoan.getId())).thenReturn(Optional.of(homeFee));
        when(customerServiceClient.verifyCustomerAndFetchKyc("sub-user-1")).thenReturn(verifiedKyc);
        when(accountServiceClient.validateDisbursementAccount("ACC-UNKNOWN", "sub-user-1", "CUS-1001", "INR"))
                .thenThrow(ApiException.notFound("DISBURSEMENT_ACCOUNT_NOT_FOUND", "Account not found"));

        ApiException ex = assertThrows(ApiException.class,
                () -> applicationService.applyForLoan(req, "idem-bad-acc", "sub-user-1"));
        assertEquals("DISBURSEMENT_ACCOUNT_NOT_FOUND", ex.getCode());
    }

    @Test
    void applyForLoan_rejectsInsufficientIncomeInvalidAmountInvalidTenureAndFoirExceeded() {
        // 1. Invalid amount
        LoanApplicationRequest badAmt = baseValidRequest();
        badAmt.setRequestedLoanAmount(new BigDecimal("100000.00"));
        when(productService.findActiveProductOrThrow("HOME_LOAN")).thenReturn(homeLoan);
        assertEquals("AMOUNT_OUT_OF_RANGE", assertThrows(ApiException.class,
                () -> applicationService.applyForLoan(badAmt, "k1", "sub-user-1")).getCode());

        // 2. Invalid tenure
        LoanApplicationRequest badTenure = baseValidRequest();
        badTenure.setTenureMonths(12);
        assertEquals("TENURE_OUT_OF_RANGE", assertThrows(ApiException.class,
                () -> applicationService.applyForLoan(badTenure, "k2", "sub-user-1")).getCode());

        // 3. Insufficient income
        LoanApplicationRequest lowIncome = baseValidRequest();
        lowIncome.setMonthlyIncome(new BigDecimal("25000.00"));
        assertEquals("INSUFFICIENT_INCOME", assertThrows(ApiException.class,
                () -> applicationService.applyForLoan(lowIncome, "k3", "sub-user-1")).getCode());

        // 4. FOIR exceeded (monthly income 60,000, existing EMIs 30,000 + proposed EMI > 60%)
        LoanApplicationRequest highFoir = baseValidRequest();
        highFoir.setMonthlyIncome(new BigDecimal("60000.00"));
        highFoir.setExistingMonthlyEMIs(new BigDecimal("30000.00"));
        highFoir.setRequestedLoanAmount(new BigDecimal("4000000.00"));
        highFoir.setCollateralValue(new BigDecimal("10000000.00"));
        when(feeRepository.findByProductId(homeLoan.getId())).thenReturn(Optional.of(homeFee));
        when(customerServiceClient.verifyCustomerAndFetchKyc("sub-user-1")).thenReturn(verifiedKyc);
        when(accountServiceClient.validateDisbursementAccount("ACC-1001", "sub-user-1", "CUS-1001", "INR"))
                .thenReturn(activeSavingsAccount);
        when(dynamicOfferService.evaluateAndSnapshotBestOffer(any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Optional.empty());

        assertEquals("FOIR_EXCEEDED", assertThrows(ApiException.class,
                () -> applicationService.applyForLoan(highFoir, "k4", "sub-user-1")).getCode());
    }

    private LoanApplicationRequest baseValidRequest() {
        LoanApplicationRequest req = new LoanApplicationRequest();
        req.setProductCode("HOME_LOAN");
        req.setEmploymentType(EmploymentType.SALARIED);
        req.setEmployerOrBusinessName("FinEdge Tech");
        req.setMonthlyIncome(new BigDecimal("150000.00"));
        req.setExistingMonthlyEMIs(new BigDecimal("5000.00"));
        req.setRequestedLoanAmount(new BigDecimal("2500000.00"));
        req.setTenureMonths(240);
        req.setDisbursementAccountNumber("ACC-1001");
        req.setLoanPurpose("Purchase of ready-to-move property");
        req.setCollateralValue(new BigDecimal("3500000.00"));
        req.setCreditBureauConsent(true);
        return req;
    }
}
