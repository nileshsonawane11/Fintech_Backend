package com.fintech.account.service;

import com.fintech.account.client.CustomerProfileDto;
import com.fintech.account.client.CustomerServiceClient;
import com.fintech.account.client.IdentityMatchResponse;
import com.fintech.account.client.IdentityServiceClient;
import com.fintech.account.dto.request.AccountApplicationRequest;
import com.fintech.account.dto.request.ApproveApplicationRequest;
import com.fintech.account.dto.request.NomineeRequest;
import com.fintech.account.dto.request.RejectApplicationRequest;
import com.fintech.account.dto.request.UnregisteredAccountApplicationRequest;
import com.fintech.account.dto.response.AccountApplicationResponse;
import com.fintech.account.dto.response.ApplicationApprovalResponse;
import com.fintech.account.dto.response.CursorPagedResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import java.time.Instant;
import java.util.List;
import com.fintech.account.entity.Account;
import com.fintech.account.entity.AccountApplication;
import com.fintech.account.entity.AccountNominee;
import com.fintech.account.entity.AccountProduct;
import com.fintech.account.enums.AccountStatus;
import com.fintech.account.enums.AccountType;
import com.fintech.account.enums.ApplicationStatus;
import com.fintech.account.enums.NomineeRelationship;
import com.fintech.account.exception.AccountException;
import com.fintech.account.repository.AccountApplicationRepository;
import com.fintech.account.repository.AccountNomineeRepository;
import com.fintech.account.repository.AccountProductRepository;
import com.fintech.account.repository.AccountRepository;
import com.fintech.account.security.EncryptionUtil;
import com.fintech.account.util.AuditLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountApplicationServiceTest {

    @Mock
    private AccountApplicationRepository applicationRepository;

    @Mock
    private AccountProductRepository productRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CustomerServiceClient customerServiceClient;

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

    @Mock
    private IdentityServiceClient identityServiceClient;

    @Mock
    private AccountNomineeRepository nomineeRepository;

    @Mock
    private EncryptionUtil encryptionUtil;

    @InjectMocks
    private AccountApplicationService applicationService;

    private AccountProduct testProduct;
    private CustomerProfileDto testCustomer;

    @BeforeEach
    void setUp() {
        testProduct = new AccountProduct();
        testProduct.setId(UUID.randomUUID());
        testProduct.setProductCode("SAVINGS_REGULAR");
        testProduct.setAccountType(AccountType.SAVINGS);
        testProduct.setCurrency("INR");
        testProduct.setMinimumBalance(new BigDecimal("10000.00"));
        testProduct.setMinimumInitialFunding(new BigDecimal("5000.00"));
        testProduct.setMinimumAge(18);
        testProduct.setActive(true);

        testCustomer = new CustomerProfileDto(
                "CUS-100234",
                "Sunita Sharma",
                LocalDate.now().minusYears(28),
                "9812345678",
                "sunita@example.com",
                "ABCDE1234F",
                "APPROVED",
                "LOW"
        );

        lenient().when(idempotencyService.execute(any(), any(), any(), any(), any()))
                .thenAnswer(inv -> ((Supplier<?>) inv.getArgument(4)).get());
    }

    @Test
    void apply_whenKycApprovedAndValid_shouldCreateApplication_Scenario1() {
        AccountApplicationRequest request = new AccountApplicationRequest(
                "SAVINGS_REGULAR",
                new BigDecimal("25000.00"),
                new NomineeRequest("Sunita Sharma", NomineeRelationship.SPOUSE, LocalDate.of(1997, 3, 21), "9812345678", 100)
        );

        when(customerServiceClient.verifyKycApproved("sub-123")).thenReturn(testCustomer);
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(applicationRepository.existsByIdentitySubjectAndProductCodeAndApplicationStatusIn(eq("sub-123"), eq("SAVINGS_REGULAR"), any()))
                .thenReturn(false);
        when(numberGenerator.generateApplicationNumber()).thenReturn("ACC-APP-900123");
        when(applicationRepository.save(any(AccountApplication.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountApplicationResponse response = applicationService.apply("sub-123", null, request);

        assertNotNull(response);
        assertEquals("ACC-APP-900123", response.accountApplicationId());
        assertEquals("CUS-100234", response.customerId());
        assertEquals("SAVINGS_REGULAR", response.productCode());
        assertEquals(ApplicationStatus.PENDING_APPROVAL, response.status());

        verify(outboxEventService).enqueueEvent(eq("ACC-APP-900123"), eq("AccountApplication"), eq("AccountApplicationSubmittedEvent"), any());
        verify(auditLogger).logAudit(eq("SUBMIT_APPLICATION"), eq("AccountApplication"), eq("ACC-APP-900123"), eq("sub-123"), any());
    }

    @Test
    void apply_whenKycPending_shouldThrowKycNotApproved_Scenario2() {
        AccountApplicationRequest request = new AccountApplicationRequest(
                "SAVINGS_REGULAR",
                new BigDecimal("25000.00"),
                null
        );

        when(customerServiceClient.verifyKycApproved("sub-pending"))
                .thenThrow(AccountException.forbidden("KYC_NOT_APPROVED", "Customer KYC is not approved"));

        AccountException ex = assertThrows(AccountException.class,
                () -> applicationService.apply("sub-pending", null, request));

        assertEquals("KYC_NOT_APPROVED", ex.getCode());
    }

    @Test
    void apply_whenInitialFundingBelowMinimum_shouldThrowInvalidInitialFunding() {
        AccountApplicationRequest request = new AccountApplicationRequest(
                "SAVINGS_REGULAR",
                new BigDecimal("1000.00"), // below 5000 minimum
                null
        );

        when(customerServiceClient.verifyKycApproved("sub-123")).thenReturn(testCustomer);
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));

        AccountException ex = assertThrows(AccountException.class,
                () -> applicationService.apply("sub-123", null, request));

        assertEquals("INVALID_INITIAL_FUNDING", ex.getCode());
    }

    @Test
    void apply_whenDuplicateApplicationExists_shouldThrowConflict() {
        AccountApplicationRequest request = new AccountApplicationRequest(
                "SAVINGS_REGULAR",
                new BigDecimal("25000.00"),
                null
        );

        when(customerServiceClient.verifyKycApproved("sub-123")).thenReturn(testCustomer);
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(applicationRepository.existsByIdentitySubjectAndProductCodeAndApplicationStatusIn(eq("sub-123"), eq("SAVINGS_REGULAR"), any()))
                .thenReturn(true);

        AccountException ex = assertThrows(AccountException.class,
                () -> applicationService.apply("sub-123", null, request));

        assertEquals("DUPLICATE_APPLICATION", ex.getCode());
    }

    @Test
    void approveApplication_shouldCreateAccountAndOutboxEvents_Scenario4() {
        AccountApplication application = new AccountApplication();
        application.setApplicationNumber("ACC-APP-900123");
        application.setCustomerId("CUS-100234");
        application.setIdentitySubject("sub-123");
        application.setProductCode("SAVINGS_REGULAR");
        application.setApplicationStatus(ApplicationStatus.PENDING_APPROVAL);

        when(applicationRepository.findByApplicationNumber("ACC-APP-900123")).thenReturn(Optional.of(application));
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(numberGenerator.generateAccountId()).thenReturn("ACC-1001");
        when(numberGenerator.generateAccountNumber()).thenReturn("1234567890123456");
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));

        ApplicationApprovalResponse response = applicationService.approveApplication(
                "ACC-APP-900123", "OPS-2001", null, new ApproveApplicationRequest("Verified"));

        assertNotNull(response);
        assertEquals("ACC-APP-900123", response.applicationId());
        assertEquals("APPROVED", response.status());
        assertEquals("ACC-1001", response.accountId());
        assertEquals("OPS-2001", response.approvedBy());

        assertEquals(ApplicationStatus.APPROVED, application.getApplicationStatus());
        verify(outboxEventService).enqueueEvent(eq("ACC-APP-900123"), eq("AccountApplication"), eq("AccountApplicationApprovedEvent"), any());
        verify(outboxEventService).enqueueEvent(eq("ACC-1001"), eq("Account"), eq("AccountCreatedEvent"), any());
        verify(auditLogger).logAudit(eq("APPROVE_APPLICATION"), any(), any(), eq("OPS-2001"), any());
    }

    @Test
    void rejectApplication_shouldUpdateStatusAndEmitEvent() {
        AccountApplication application = new AccountApplication();
        application.setApplicationNumber("ACC-APP-900123");
        application.setCustomerId("CUS-100234");
        application.setProductCode("SAVINGS_REGULAR");
        application.setApplicationStatus(ApplicationStatus.PENDING_APPROVAL);

        when(applicationRepository.findByApplicationNumber("ACC-APP-900123")).thenReturn(Optional.of(application));

        RejectApplicationRequest request = new RejectApplicationRequest("INSUFFICIENT_DOCUMENTATION", "Remarks");
        applicationService.rejectApplication("ACC-APP-900123", "OPS-2001", request);

        assertEquals(ApplicationStatus.REJECTED, application.getApplicationStatus());
        verify(outboxEventService).enqueueEvent(eq("ACC-APP-900123"), eq("AccountApplication"), eq("AccountApplicationRejectedEvent"), any());
    }

    @Test
    void cancelMyApplication_whenPending_shouldCancelSuccessfully() {
        AccountApplication application = new AccountApplication();
        application.setApplicationNumber("ACC-APP-900123");
        application.setIdentitySubject("sub-123");
        application.setApplicationStatus(ApplicationStatus.PENDING_APPROVAL);

        when(applicationRepository.findByApplicationNumber("ACC-APP-900123")).thenReturn(Optional.of(application));

        applicationService.cancelMyApplication("sub-123", "ACC-APP-900123");

        assertEquals(ApplicationStatus.CANCELLED, application.getApplicationStatus());
        verify(outboxEventService).enqueueEvent(eq("ACC-APP-900123"), eq("AccountApplication"), eq("AccountApplicationCancelledEvent"), any());
    }

    @Test
    void cancelMyApplication_whenAlreadyApproved_shouldThrowUnprocessable() {
        AccountApplication application = new AccountApplication();
        application.setApplicationNumber("ACC-APP-900123");
        application.setIdentitySubject("sub-123");
        application.setApplicationStatus(ApplicationStatus.APPROVED);

        when(applicationRepository.findByApplicationNumber("ACC-APP-900123")).thenReturn(Optional.of(application));

        assertThrows(AccountException.class, () -> applicationService.cancelMyApplication("sub-123", "ACC-APP-900123"));
    }

    @Test
    void applyUnregistered_whenNewApplicant_shouldCreateIdentityProfileAndApplication() {
        UnregisteredAccountApplicationRequest request = new UnregisteredAccountApplicationRequest(
                "SAVINGS_REGULAR",
                new BigDecimal("25000.00"),
                "Rahul Verma",
                LocalDate.of(1995, 5, 15),
                "MALE",
                "9876543210",
                "rahul.verma@example.com",
                "Flat 101, MG Road",
                "Near Metro",
                "Bengaluru",
                "Karnataka",
                "560001",
                "ABCDE1234F",
                "123456789012",
                new NomineeRequest("Pooja Verma", NomineeRelationship.SPOUSE, LocalDate.of(1996, 6, 20), "9876543211", 100)
        );

        UUID newIdentityId = UUID.randomUUID();
        when(identityServiceClient.matchIdentity(any(), any()))
                .thenReturn(new IdentityMatchResponse(false, null, null, null, null, null));
        when(identityServiceClient.createApplicantIdentity(eq("Rahul Verma"), eq("9876543210"), eq("rahul.verma@example.com")))
                .thenReturn(new IdentityMatchResponse(true, newIdentityId, "Rahul Verma", "9876543210", "rahul.verma@example.com", "PENDING_VERIFICATION"));
        when(customerServiceClient.provisionApplicantProfile(any())).thenReturn(testCustomer);
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(applicationRepository.existsByIdentitySubjectAndProductCodeAndApplicationStatusIn(eq(newIdentityId.toString()), eq("SAVINGS_REGULAR"), any()))
                .thenReturn(false);
        when(numberGenerator.generateApplicationNumber()).thenReturn("ACC-APP-888001");
        when(applicationRepository.save(any(AccountApplication.class))).thenAnswer(inv -> inv.getArgument(0));
        when(encryptionUtil.encrypt(any())).thenReturn("encrypted_mobile");

        AccountApplicationResponse response = applicationService.applyUnregistered(null, request);

        assertNotNull(response);
        assertEquals("ACC-APP-888001", response.accountApplicationId());
        assertEquals("CUS-100234", response.customerId());
        assertEquals(ApplicationStatus.PENDING_APPROVAL, response.status());

        verify(identityServiceClient).createApplicantIdentity("Rahul Verma", "9876543210", "rahul.verma@example.com");
        verify(customerServiceClient).provisionApplicantProfile(any());
        verify(nomineeRepository).save(any(AccountNominee.class));
        verify(outboxEventService).enqueueEvent(eq("ACC-APP-888001"), eq("AccountApplication"), eq("AccountApplicationSubmittedEvent"), any());
    }

    @Test
    void applyUnregistered_whenExistingApplicant_shouldReuseIdentityWithoutCreatingNew() {
        UnregisteredAccountApplicationRequest request = new UnregisteredAccountApplicationRequest(
                "SAVINGS_REGULAR",
                new BigDecimal("25000.00"),
                "Rahul Verma",
                LocalDate.of(1995, 5, 15),
                "MALE",
                "9876543210",
                "rahul.verma@example.com",
                "Flat 101, MG Road",
                "Near Metro",
                "Bengaluru",
                "Karnataka",
                "560001",
                "ABCDE1234F",
                "123456789012",
                null
        );

        UUID existingId = UUID.randomUUID();
        when(identityServiceClient.matchIdentity(any(), any()))
                .thenReturn(new IdentityMatchResponse(true, existingId, "Rahul Verma", "9876543210", "rahul.verma@example.com", "ACTIVE"));
        when(customerServiceClient.provisionApplicantProfile(any())).thenReturn(testCustomer);
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(applicationRepository.existsByIdentitySubjectAndProductCodeAndApplicationStatusIn(eq(existingId.toString()), eq("SAVINGS_REGULAR"), any()))
                .thenReturn(false);
        when(numberGenerator.generateApplicationNumber()).thenReturn("ACC-APP-888002");
        when(applicationRepository.save(any(AccountApplication.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountApplicationResponse response = applicationService.applyUnregistered(null, request);

        assertNotNull(response);
        assertEquals("ACC-APP-888002", response.accountApplicationId());
        verify(identityServiceClient, never()).createApplicantIdentity(any(), any(), any());
        verify(customerServiceClient).provisionApplicantProfile(any());
    }

    @Test
    void applyUnregistered_whenIdentityConflict_shouldPropagateConflictException() {
        UnregisteredAccountApplicationRequest request = new UnregisteredAccountApplicationRequest(
                "SAVINGS_REGULAR",
                new BigDecimal("25000.00"),
                "Rahul Verma",
                LocalDate.of(1995, 5, 15),
                "MALE",
                "9876543210",
                "rahul.verma@example.com",
                "Flat 101, MG Road",
                "Near Metro",
                "Bengaluru",
                "Karnataka",
                "560001",
                "ABCDE1234F",
                "123456789012",
                null
        );

        when(identityServiceClient.matchIdentity(any(), any()))
                .thenThrow(AccountException.conflict("IDENTITY_CONFLICT", "Mobile and email belong to different identities"));

        AccountException ex = assertThrows(AccountException.class,
                () -> applicationService.applyUnregistered(null, request));

        assertEquals("IDENTITY_CONFLICT", ex.getCode());
        verify(customerServiceClient, never()).provisionApplicantProfile(any());
    }

    @Test
    void applyUnregistered_whenDuplicateApplicationExists_shouldThrowConflict() {
        UnregisteredAccountApplicationRequest request = new UnregisteredAccountApplicationRequest(
                "SAVINGS_REGULAR",
                new BigDecimal("25000.00"),
                "Rahul Verma",
                LocalDate.of(1995, 5, 15),
                "MALE",
                "9876543210",
                "rahul.verma@example.com",
                "Flat 101, MG Road",
                "Near Metro",
                "Bengaluru",
                "Karnataka",
                "560001",
                "ABCDE1234F",
                "123456789012",
                null
        );

        UUID existingId = UUID.randomUUID();
        when(identityServiceClient.matchIdentity(any(), any()))
                .thenReturn(new IdentityMatchResponse(true, existingId, "Rahul Verma", "9876543210", "rahul.verma@example.com", "ACTIVE"));
        when(customerServiceClient.provisionApplicantProfile(any())).thenReturn(testCustomer);
        when(productRepository.findByProductCode("SAVINGS_REGULAR")).thenReturn(Optional.of(testProduct));
        when(applicationRepository.existsByIdentitySubjectAndProductCodeAndApplicationStatusIn(eq(existingId.toString()), eq("SAVINGS_REGULAR"), any()))
                .thenReturn(true);

        AccountException ex = assertThrows(AccountException.class,
                () -> applicationService.applyUnregistered(null, request));

        assertEquals("DUPLICATE_APPLICATION", ex.getCode());
    }

    @Test
    void listOpsApplications_withFiltersAndHasNext_shouldReturnPagedResponseWithCursor() {
        AccountApplication app1 = new AccountApplication();
        app1.setApplicationNumber("ACC-APP-1002");
        app1.setCustomerId("CUS-100");
        app1.setProductCode("SAVINGS_REGULAR");
        app1.setApplicationStatus(ApplicationStatus.PENDING_APPROVAL);
        app1.setInitialFundingAmount(new BigDecimal("10000.00"));
        app1.setCurrency("INR");
        app1.setSubmittedAt(Instant.now());

        AccountApplication app2 = new AccountApplication();
        app2.setApplicationNumber("ACC-APP-1001");
        app2.setCustomerId("CUS-100");
        app2.setProductCode("SAVINGS_REGULAR");
        app2.setApplicationStatus(ApplicationStatus.PENDING_APPROVAL);
        app2.setInitialFundingAmount(new BigDecimal("10000.00"));
        app2.setCurrency("INR");
        app2.setSubmittedAt(Instant.now());

        Slice<AccountApplication> slice = new SliceImpl<>(List.of(app1, app2), PageRequest.of(0, 2), true);

        when(applicationRepository.findOpsApplicationsWithCursor(
                eq(ApplicationStatus.PENDING_APPROVAL),
                eq("CUS-100"),
                eq("SAVINGS_REGULAR"),
                any(), any(), isNull(),
                eq(PageRequest.of(0, 2))
        )).thenReturn(slice);

        CursorPagedResponse<AccountApplicationResponse> response = applicationService.listOpsApplications(
                ApplicationStatus.PENDING_APPROVAL, "  CUS-100  ", " SAVINGS_REGULAR ",
                Instant.now().minusSeconds(3600), Instant.now(), "   ", 2);

        assertNotNull(response);
        assertEquals(2, response.data().size());
        assertTrue(response.pagination().hasMore());
        assertEquals("ACC-APP-1001", response.pagination().nextCursor());
        assertEquals(2, response.pagination().limit());
    }

    @Test
    void listOpsApplications_withNoNextPage_shouldReturnNullNextCursor() {
        AccountApplication app = new AccountApplication();
        app.setApplicationNumber("ACC-APP-1001");
        app.setCustomerId("CUS-100");
        app.setProductCode("SAVINGS_REGULAR");
        app.setApplicationStatus(ApplicationStatus.APPROVED);
        app.setInitialFundingAmount(new BigDecimal("5000.00"));
        app.setCurrency("INR");
        app.setSubmittedAt(Instant.now());

        Slice<AccountApplication> slice = new SliceImpl<>(List.of(app), PageRequest.of(0, 20), false);

        when(applicationRepository.findOpsApplicationsWithCursor(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), eq(PageRequest.of(0, 20))
        )).thenReturn(slice);

        CursorPagedResponse<AccountApplicationResponse> response = applicationService.listOpsApplications(
                null, null, null, null, null, null, 0);

        assertNotNull(response);
        assertEquals(1, response.data().size());
        assertFalse(response.pagination().hasMore());
        assertNull(response.pagination().nextCursor());
        assertEquals(20, response.pagination().limit());
    }
}
