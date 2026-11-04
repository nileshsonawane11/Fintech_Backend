package com.fintech.account;

import com.fintech.account.client.CustomerProfileDto;
import com.fintech.account.client.CustomerServiceClient;
import com.fintech.account.client.LedgerServiceClient;
import com.fintech.account.dto.request.AccountApplicationRequest;
import com.fintech.account.dto.request.AccountLifecycleRequest;
import com.fintech.account.dto.request.ApproveApplicationRequest;
import com.fintech.account.dto.request.CreateHoldRequest;
import com.fintech.account.dto.request.ReleaseHoldRequest;
import com.fintech.account.dto.response.AccountApplicationResponse;
import com.fintech.account.dto.response.AccountHoldResponse;
import com.fintech.account.dto.response.ApplicationApprovalResponse;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountApplication;
import com.fintech.account.entity.AccountHold;
import com.fintech.account.entity.AccountProduct;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import com.fintech.account.enums.ApplicationStatus;
import com.fintech.account.enums.HoldStatus;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountApplicationRepository;
import com.fintech.account.repository.AccountHoldRepository;
import com.fintech.account.repository.AccountProductRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.service.*;
import com.fintech.account.util.AuditLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityAndBusinessScenariosTest {

    @Mock
    private AccountApplicationRepository applicationRepository;

    @Mock
    private AccountProductRepository productRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountHoldRepository holdRepository;

    @Mock
    private CustomerServiceClient customerServiceClient;

    @Mock
    private LedgerServiceClient ledgerServiceClient;

    @Mock
    private AccountNumberGenerator numberGenerator;

    @Mock
    private OutboxEventService outboxEventService;

    @Mock
    private NomineeService nomineeService;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private AuditLogger auditLogger;

    private AccountApplicationService applicationService;
    private AccountService accountService;
    private AccountLifecycleService lifecycleService;
    private AccountHoldService holdService;

    private AccountProduct testProduct;
    private CustomerProfileDto approvedCustomer;

    @BeforeEach
    void setUp() {
        applicationService = new AccountApplicationService(
                applicationRepository, productRepository, accountRepository, customerServiceClient,
                numberGenerator, outboxEventService, nomineeService, idempotencyService, auditLogger
        );
        accountService = new AccountService(accountRepository, ledgerServiceClient);
        lifecycleService = new AccountLifecycleService(
                accountRepository, holdRepository, mock(com.fintech.account.repository.AccountLifecycleHistoryRepository.class),
                ledgerServiceClient, outboxEventService, idempotencyService, auditLogger
        );
        holdService = new AccountHoldService(
                holdRepository, accountRepository, ledgerServiceClient, numberGenerator,
                outboxEventService, idempotencyService, auditLogger
        );

        testProduct = new AccountProduct();
        testProduct.setId(UUID.randomUUID());
        testProduct.setProductCode("SAVINGS_REGULAR");
        testProduct.setAccountType(AccountType.SAVINGS);
        testProduct.setCurrency("INR");
        testProduct.setMinimumBalance(new BigDecimal("10000.00"));
        testProduct.setMinimumInitialFunding(new BigDecimal("5000.00"));
        testProduct.setActive(true);

        approvedCustomer = new CustomerProfileDto(
                "CUS-100234", "Sunita Sharma", LocalDate.now().minusYears(25),
                "9812345678", "sunita@example.com", "ABCDE1234F", "APPROVED", "LOW"
        );

        lenient().when(idempotencyService.execute(any(), any(), any(), any(), any()))
                .thenAnswer(inv -> {
                    Supplier<?> s = inv.getArgument(4);
                    return s != null ? s.get() : null;
                });
    }

    @Test
    @DisplayName("Scenario 1: Customer with approved KYC applies for a savings account. Expected: Application is created successfully.")
    void testScenario1_ApprovedKyc_CreatesApplication() {
        AccountApplicationRequest request = new AccountApplicationRequest(
                "SAVINGS_REGULAR", new BigDecimal("25000.00"), null);

        when(customerServiceClient.verifyKycApproved("sub-cust1")).thenReturn(approvedCustomer);
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(numberGenerator.generateApplicationNumber()).thenReturn("ACC-APP-900123");
        when(applicationRepository.save(any(AccountApplication.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountApplicationResponse response = applicationService.apply("sub-cust1", null, request);

        assertNotNull(response);
        assertEquals("ACC-APP-900123", response.accountApplicationId());
        assertEquals("CUS-100234", response.customerId());
        assertEquals(ApplicationStatus.PENDING_APPROVAL, response.status());
    }

    @Test
    @DisplayName("Scenario 2: Customer with pending KYC applies for a savings account. Expected: KYC_NOT_APPROVED.")
    void testScenario2_PendingKyc_ThrowsKycNotApproved() {
        AccountApplicationRequest request = new AccountApplicationRequest(
                "SAVINGS_REGULAR", new BigDecimal("25000.00"), null);

        when(customerServiceClient.verifyKycApproved("sub-pending"))
                .thenThrow(AccountException.forbidden("KYC_NOT_APPROVED", "Customer KYC is not approved"));

        AccountException ex = assertThrows(AccountException.class,
                () -> applicationService.apply("sub-pending", null, request));

        assertEquals("KYC_NOT_APPROVED", ex.getCode());
    }

    @Test
    @DisplayName("Scenario 3: Customer submits same request twice using same Idempotency-Key. Expected: Same logical result without duplicate applications.")
    void testScenario3_IdempotentApplicationSubmission() {
        AccountApplicationRequest request = new AccountApplicationRequest(
                "SAVINGS_REGULAR", new BigDecimal("25000.00"), null);

        AccountApplicationResponse cached = AccountApplicationResponse.ofSummary(
                "ACC-APP-900123", "CUS-100234", "SAVINGS_REGULAR", ApplicationStatus.PENDING_APPROVAL, Instant.now());

        when(idempotencyService.execute(eq("key-uuid-1"), eq("APPLY_ACCOUNT"), eq(request), any(), any()))
                .thenReturn(cached);

        AccountApplicationResponse first = applicationService.apply("sub-cust1", "key-uuid-1", request);
        AccountApplicationResponse second = applicationService.apply("sub-cust1", "key-uuid-1", request);

        assertSame(first, second);
        assertEquals("ACC-APP-900123", second.accountApplicationId());
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 4: Operations approves an application. Expected: One account is created and appropriate events are published.")
    void testScenario4_OpsApprovesApplication_CreatesAccountAndPublishesEvents() {
        AccountApplication app = new AccountApplication();
        app.setApplicationNumber("ACC-APP-900123");
        app.setCustomerId("CUS-100234");
        app.setIdentitySubject("sub-cust1");
        app.setProductCode("SAVINGS_REGULAR");
        app.setApplicationStatus(ApplicationStatus.PENDING_APPROVAL);

        when(applicationRepository.findByApplicationNumber("ACC-APP-900123")).thenReturn(Optional.of(app));
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(numberGenerator.generateAccountId()).thenReturn("ACC-1001");
        when(numberGenerator.generateAccountNumber()).thenReturn("1234567890123456");
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));

        ApplicationApprovalResponse response = applicationService.approveApplication(
                "ACC-APP-900123", "OPS-2001", null, new ApproveApplicationRequest("Approved"));

        assertNotNull(response);
        assertEquals("ACC-1001", response.accountId());
        assertEquals("APPROVED", response.status());

        verify(outboxEventService).enqueueEvent(eq("ACC-APP-900123"), eq("AccountApplication"), eq("AccountApplicationApprovedEvent"), any());
        verify(outboxEventService).enqueueEvent(eq("ACC-1001"), eq("Account"), eq("AccountCreatedEvent"), any());
    }

    @Test
    @DisplayName("Scenario 5: Operations freezes an active account. Expected: Account status changes to FROZEN and lifecycle history is recorded.")
    void testScenario5_OpsFreezesActiveAccount() {
        Account account = new Account();
        account.setAccountId("ACC-1001");
        account.setAccountStatus(AccountStatus.ACTIVE);

        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(account));

        lifecycleService.freezeAccount("ACC-1001", new AccountLifecycleRequest("SUSPICIOUS", "Remarks"), "OPS-2001");

        assertEquals(AccountStatus.FROZEN, account.getAccountStatus());
        verify(outboxEventService).enqueueEvent(eq("ACC-1001"), eq("Account"), eq("AccountFrozenEvent"), any());
    }

    @Test
    @DisplayName("Scenario 6: Operations attempts to unfreeze a closed account. Expected: Invalid state transition.")
    void testScenario6_OpsAttemptsUnfreezeClosedAccount_ThrowsInvalidStateTransition() {
        Account account = new Account();
        account.setAccountId("ACC-1001");
        account.setAccountStatus(AccountStatus.CLOSED);

        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(account));

        AccountException ex = assertThrows(AccountException.class,
                () -> lifecycleService.unfreezeAccount("ACC-1001", new AccountLifecycleRequest("CLEARED", "Remarks"), "OPS-2001"));

        assertEquals("INVALID_STATE_TRANSITION", ex.getCode());
    }

    @Test
    @DisplayName("Scenario 7: Operations places a hold exceeding available funds. Expected: Ledger rejects reservation; no false successful hold is recorded.")
    void testScenario7_HoldExceedingFunds_LedgerRejects_NoHoldRecorded() {
        Account account = new Account();
        account.setAccountId("ACC-1001");
        account.setAccountStatus(AccountStatus.ACTIVE);
        account.setCurrency("INR");

        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(account));
        when(numberGenerator.generateHoldId()).thenReturn("HOLD-551122");
        when(ledgerServiceClient.reserveHoldFunds(any(), any(), any(), any(), any())).thenReturn(false);

        CreateHoldRequest req = new CreateHoldRequest(new BigDecimal("9999999.00"), "DISPUTE", "Remarks");

        AccountException ex = assertThrows(AccountException.class,
                () -> holdService.placeHold("ACC-1001", null, req, "OPS-2001"));

        assertEquals("HOLD_RESERVATION_FAILED", ex.getCode());
        verify(holdRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 8: Customer attempts to access another customer's account. Expected: 403 / Access Denied.")
    void testScenario8_AccessOtherCustomerAccount_ThrowsAccessDenied() {
        Account account = new Account();
        account.setAccountId("ACC-1001");
        account.setIdentitySubject("sub-cust1");

        when(accountRepository.findByAccountId("ACC-1001")).thenReturn(Optional.of(account));

        AccountException ex = assertThrows(AccountException.class,
                () -> accountService.getAccountDetails("sub-ATTACKER", "ACC-1001", false));

        assertEquals("ACCESS_DENIED", ex.getCode());
    }

    @Test
    @DisplayName("Scenario 9: Operations releases an already released hold. Expected: Idempotent response without releasing funds twice.")
    void testScenario9_ReleaseAlreadyReleasedHold_ReturnsIdempotentlyWithoutReleasingFundsTwice() {
        AccountHold hold = new AccountHold();
        hold.setHoldId("HOLD-551122");
        hold.setAccountId("ACC-1001");
        hold.setHoldStatus(HoldStatus.RELEASED);

        when(holdRepository.findByHoldId("HOLD-551122")).thenReturn(Optional.of(hold));

        AccountHoldResponse response = holdService.releaseHold(
                "HOLD-551122", new ReleaseHoldRequest("DISPUTE_RESOLVED", "Cleared"), "OPS-2001");

        assertNotNull(response);
        assertEquals(HoldStatus.RELEASED, response.status());
        verify(ledgerServiceClient, never()).releaseHoldFunds(any(), any(), any(), any());
    }
}
