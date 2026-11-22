package com.fintech.card.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fintech.card.client.AccountServiceClient;
import com.fintech.card.client.CustomerServiceClient;
import com.fintech.card.client.dto.AccountVerificationDto;
import com.fintech.card.client.dto.AddressVerificationDto;
import com.fintech.card.client.dto.CustomerProfileDto;
import com.fintech.card.domain.CardApplicationNormalizer;
import com.fintech.card.domain.CardEligibilityValidator;
import com.fintech.card.domain.CardProductCatalog;
import com.fintech.card.dto.request.ApproveCardApplicationRequest;
import com.fintech.card.dto.request.CardApplicationRequest;
import com.fintech.card.dto.request.RejectCardApplicationRequest;
import com.fintech.card.dto.response.CardApplicationResponse;
import com.fintech.card.dto.response.OpsCardApplicationResponse;
import com.fintech.card.entity.Card;
import com.fintech.card.entity.CardApplication;
import com.fintech.card.entity.CardApplicationIdempotencyKey;
import com.fintech.card.entity.CardOutboxEvent;
import com.fintech.card.event.producer.CardOutboxEventService;
import com.fintech.card.exception.*;
import com.fintech.card.repository.CardApplicationIdempotencyKeyRepository;
import com.fintech.card.repository.CardApplicationRepository;
import com.fintech.card.repository.CardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardApplicationServiceTest {

    @Mock
    private CardApplicationRepository cardApplicationRepository;

    @Mock
    private CardApplicationIdempotencyKeyRepository idempotencyKeyRepository;

    @Mock
    private CardRepository cardRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @Mock
    private CustomerServiceClient customerServiceClient;

    @Mock
    private CardOutboxEventService outboxEventService;

    private CardProductCatalog productCatalog;
    private CardApplicationNormalizer normalizer;
    private CardEligibilityValidator eligibilityValidator;
    private CardIdempotencyService idempotencyService;
    private ObjectMapper objectMapper;

    private CardApplicationService cardApplicationService;

    private final String customerId = "CUS-100234";
    private final String accountId = "ACC-1001";
    private final String addressId = UUID.randomUUID().toString();

    @BeforeEach
    void setUp() {
        productCatalog = new CardProductCatalog();
        normalizer = new CardApplicationNormalizer(productCatalog);
        eligibilityValidator = new CardEligibilityValidator(cardApplicationRepository, productCatalog);
        idempotencyService = new CardIdempotencyService(idempotencyKeyRepository);

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        cardApplicationService = new CardApplicationService(
                cardApplicationRepository,
                idempotencyKeyRepository,
                cardRepository,
                accountServiceClient,
                customerServiceClient,
                normalizer,
                eligibilityValidator,
                idempotencyService,
                outboxEventService,
                objectMapper
        );
    }

    private CardApplicationRequest createValidRequest() {
        CardApplicationRequest request = new CardApplicationRequest();
        request.setCardType("CREDIT");
        request.setCardName("FinEdge Edge Cashback Card");
        request.setProductSlug("edge-cashback-credit");
        request.setLinkedAccountId(accountId);
        request.setDeliveryAddressId(addressId);
        request.setRequestedLimit(new BigDecimal("50000.00"));
        return request;
    }

    private AccountVerificationDto createValidAccount() {
        return new AccountVerificationDto(
                accountId,
                "****1234",
                customerId,
                customerId,
                "SAVINGS",
                "PRD-SAV",
                "ACTIVE",
                "INR",
                Instant.now()
        );
    }

    private AddressVerificationDto createValidAddress() {
        return new AddressVerificationDto(
                UUID.fromString(addressId),
                customerId,
                customerId,
                "RESIDENTIAL",
                "123 MG Road",
                "Suite 100",
                "Bangalore",
                "Karnataka",
                "560001",
                "India",
                "ACTIVE",
                true,
                Instant.now()
        );
    }

    @Test
    @DisplayName("Complete valid card application succeeds, persists application, and enqueues outbox event")
    void testApplyForCard_CompleteWorkflow_Succeeds() {
        CardApplicationRequest request = createValidRequest();

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId)).thenReturn(createValidAccount());
        when(customerServiceClient.getAddressVerification(addressId)).thenReturn(createValidAddress());
        when(customerServiceClient.getCustomerProfile(customerId)).thenReturn(new CustomerProfileDto(
                customerId, "Vikramaditya Sharma", LocalDate.now().minusYears(30),
                "******1234", "v***@gmail.com", "*****1234K", "APPROVED", "LOW", "MALE"
        ));
        when(cardApplicationRepository.existsByCustomerIdAndLinkedAccountIdAndCardTypeAndStatusIn(
                eq(customerId), eq(accountId), eq("CREDIT"), any())).thenReturn(false);

        when(cardApplicationRepository.save(any(CardApplication.class))).thenAnswer(i -> i.getArgument(0));
        when(outboxEventService.enqueueEvent(any(), any(), any(), any()))
                .thenReturn(new CardOutboxEvent(UUID.randomUUID(), "CARD-APP-1", "CARD_APPLICATION", "CARD_APPLICATION_SUBMITTED", "{}"));

        CardApplicationResponse response = cardApplicationService.applyForCard(customerId, "idem-001", request);

        assertNotNull(response);
        assertNotNull(response.getCardApplicationId());
        assertEquals("PENDING_APPROVAL", response.getStatus());
        assertEquals(accountId, response.getLinkedAccountId());
        assertEquals(addressId, response.getDeliveryAddressId());
        assertEquals("FinEdge Edge Cashback Card", response.getCardName());
        assertEquals("edge-cashback-credit", response.getProductSlug());

        verify(cardApplicationRepository).save(any(CardApplication.class));
        verify(outboxEventService).enqueueEvent(any(), eq("CARD_APPLICATION"), eq("CARD_APPLICATION_SUBMITTED"), any());
        verify(idempotencyKeyRepository).save(any(CardApplicationIdempotencyKey.class));
    }

    @Test
    @DisplayName("Idempotency replay with exact same key and payload returns cached response")
    void testApplyForCard_IdempotencyReplay_ExactPayload_ReturnsCached() {
        CardApplicationRequest request = createValidRequest();
        String hash = idempotencyService.computeFingerprint(normalizer.normalize(request));

        CardApplicationIdempotencyKey keyRecord = new CardApplicationIdempotencyKey();
        keyRecord.setIdempotencyKey("idem-replay");
        keyRecord.setCardApplicationId("CARD-APP-EXISTING");
        keyRecord.setCustomerId(customerId);
        keyRecord.setRequestHash(hash);

        CardApplication existingApp = new CardApplication();
        existingApp.setCardApplicationId("CARD-APP-EXISTING");
        existingApp.setCustomerId(customerId);
        existingApp.setCardType("CREDIT");
        existingApp.setCardName("FinEdge Edge Cashback Card");
        existingApp.setProductSlug("edge-cashback-credit");
        existingApp.setLinkedAccountId(accountId);
        existingApp.setDeliveryAddressId(addressId);
        existingApp.setStatus("PENDING_APPROVAL");
        existingApp.setEstimatedDeliveryDate(LocalDate.now().plusDays(7));

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-replay")).thenReturn(Optional.of(keyRecord));
        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-EXISTING")).thenReturn(Optional.of(existingApp));

        CardApplicationResponse response = cardApplicationService.applyForCard(customerId, "idem-replay", request);

        assertNotNull(response);
        assertEquals("CARD-APP-EXISTING", response.getCardApplicationId());
        verify(accountServiceClient, never()).getAccountVerification(any());
        verify(cardApplicationRepository, never()).save(any());
        verify(outboxEventService, never()).enqueueEvent(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Idempotency key reuse by different customer throws IdempotencyConflictException (409)")
    void testApplyForCard_IdempotencyKeyDifferentCustomer_ThrowsConflict() {
        CardApplicationRequest request = createValidRequest();

        CardApplicationIdempotencyKey keyRecord = new CardApplicationIdempotencyKey();
        keyRecord.setIdempotencyKey("idem-stolen");
        keyRecord.setCustomerId("CUS-OTHER");

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-stolen")).thenReturn(Optional.of(keyRecord));

        assertThrows(IdempotencyConflictException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-stolen", request));
    }

    @Test
    @DisplayName("Idempotency key reuse with modified payload throws IdempotencyConflictException (409)")
    void testApplyForCard_IdempotencyKeyDifferentPayload_ThrowsConflict() {
        CardApplicationRequest request = createValidRequest();

        CardApplicationIdempotencyKey keyRecord = new CardApplicationIdempotencyKey();
        keyRecord.setIdempotencyKey("idem-payload-diff");
        keyRecord.setCustomerId(customerId);
        keyRecord.setRequestHash("DIFFERENT_HASH_VALUE");

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-payload-diff")).thenReturn(Optional.of(keyRecord));

        assertThrows(IdempotencyConflictException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-payload-diff", request));
    }

    @Test
    @DisplayName("Conflicting linkedAccountId and accountId throws CardApplicationValidationException")
    void testApplyForCard_ConflictingAccountIds_ThrowsValidationException() {
        CardApplicationRequest request = createValidRequest();
        request.setLinkedAccountId("ACC-1001");
        request.setAccountId("ACC-9999");

        assertThrows(CardApplicationValidationException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-1", request));
    }

    @Test
    @DisplayName("Conflicting cardType and kind throws CardApplicationValidationException")
    void testApplyForCard_ConflictingCardType_ThrowsValidationException() {
        CardApplicationRequest request = createValidRequest();
        request.setCardType("CREDIT");
        request.setKind("DEBIT");

        assertThrows(CardApplicationValidationException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-1", request));
    }

    @Test
    @DisplayName("Conflicting requestedLimit and limit throws CardApplicationValidationException")
    void testApplyForCard_ConflictingLimit_ThrowsValidationException() {
        CardApplicationRequest request = createValidRequest();
        request.setRequestedLimit(new BigDecimal("50000.00"));
        request.setLimit(new BigDecimal("100000.00"));

        assertThrows(CardApplicationValidationException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-1", request));
    }

    @Test
    @DisplayName("Missing deliveryAddressId throws CardApplicationValidationException")
    void testApplyForCard_MissingAddress_ThrowsValidationException() {
        CardApplicationRequest request = createValidRequest();
        request.setDeliveryAddressId(null);

        assertThrows(CardApplicationValidationException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-1", request));
    }

    @Test
    @DisplayName("Account not found in Account Service throws AccountNotFoundException (404)")
    void testApplyForCard_AccountNotFound_Throws404() {
        CardApplicationRequest request = createValidRequest();

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId))
                .thenThrow(new AccountNotFoundException("Account ACC-1001 not found"));

        assertThrows(AccountNotFoundException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Account belonging to another customer throws AccountOwnershipMismatchException (403)")
    void testApplyForCard_AccountBelongsToOtherCustomer_Throws403() {
        CardApplicationRequest request = createValidRequest();

        AccountVerificationDto otherCustomerAccount = new AccountVerificationDto(
                accountId, "****1234", "CUS-OTHER", "CUS-OTHER", "SAVINGS", "PRD-SAV", "ACTIVE", "INR", Instant.now()
        );

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId)).thenReturn(otherCustomerAccount);
        when(customerServiceClient.getAddressVerification(addressId)).thenReturn(createValidAddress());

        assertThrows(AccountOwnershipMismatchException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Account in FROZEN or BLOCKED status throws AccountNotEligibleException (422)")
    void testApplyForCard_AccountBlockedOrFrozen_Throws422() {
        CardApplicationRequest request = createValidRequest();

        AccountVerificationDto blockedAccount = new AccountVerificationDto(
                accountId, "****1234", customerId, customerId, "SAVINGS", "PRD-SAV", "BLOCKED", "INR", Instant.now()
        );

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId)).thenReturn(blockedAccount);
        when(customerServiceClient.getAddressVerification(addressId)).thenReturn(createValidAddress());

        assertThrows(AccountNotEligibleException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Account in FIXED_DEPOSIT is ineligible for card and throws AccountNotEligibleException (422)")
    void testApplyForCard_FixedDepositAccount_Throws422() {
        CardApplicationRequest request = createValidRequest();

        AccountVerificationDto fdAccount = new AccountVerificationDto(
                accountId, "****1234", customerId, customerId, "FIXED_DEPOSIT", "PRD-FD", "ACTIVE", "INR", Instant.now()
        );

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId)).thenReturn(fdAccount);
        when(customerServiceClient.getAddressVerification(addressId)).thenReturn(createValidAddress());

        assertThrows(AccountNotEligibleException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Account Service timeout throws ExternalServiceTimeoutException (504)")
    void testApplyForCard_AccountServiceTimeout_Throws504() {
        CardApplicationRequest request = createValidRequest();

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId))
                .thenThrow(new ExternalServiceTimeoutException("Account Service timed out"));

        assertThrows(ExternalServiceTimeoutException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Account Service unavailable throws ExternalServiceUnavailableException (503)")
    void testApplyForCard_AccountServiceUnavailable_Throws503() {
        CardApplicationRequest request = createValidRequest();

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId))
                .thenThrow(new ExternalServiceUnavailableException("Account Service is unreachable"));

        assertThrows(ExternalServiceUnavailableException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Address not found throws AddressNotFoundException (404)")
    void testApplyForCard_AddressNotFound_Throws404() {
        CardApplicationRequest request = createValidRequest();

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId)).thenReturn(createValidAccount());
        when(customerServiceClient.getAddressVerification(addressId))
                .thenThrow(new AddressNotFoundException("Delivery address not found"));

        assertThrows(AddressNotFoundException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Address belonging to another customer throws AddressOwnershipMismatchException (403)")
    void testApplyForCard_AddressBelongsToOtherCustomer_Throws403() {
        CardApplicationRequest request = createValidRequest();

        AddressVerificationDto otherCustomerAddress = new AddressVerificationDto(
                UUID.fromString(addressId), "CUS-OTHER", "CUS-OTHER", "RESIDENTIAL",
                "456 Park St", null, "Mumbai", "Maharashtra", "400001", "India", "ACTIVE", true, Instant.now()
        );

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId)).thenReturn(createValidAccount());
        when(customerServiceClient.getAddressVerification(addressId)).thenReturn(otherCustomerAddress);

        assertThrows(AddressOwnershipMismatchException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Address not deliverable throws AddressNotDeliverableException (422)")
    void testApplyForCard_AddressNotDeliverable_Throws422() {
        CardApplicationRequest request = createValidRequest();

        AddressVerificationDto nonDeliverableAddress = new AddressVerificationDto(
                UUID.fromString(addressId), customerId, customerId, "RESIDENTIAL",
                "123 MG Road", null, "Bangalore", "Karnataka", "560001", "India", "ACTIVE", false, Instant.now()
        );

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId)).thenReturn(createValidAccount());
        when(customerServiceClient.getAddressVerification(addressId)).thenReturn(nonDeliverableAddress);

        assertThrows(AddressNotDeliverableException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Duplicate pending application throws CardApplicationAlreadyExistsException (409)")
    void testApplyForCard_DuplicatePendingApplication_Throws409() {
        CardApplicationRequest request = createValidRequest();

        when(idempotencyKeyRepository.findByIdempotencyKey("idem-001")).thenReturn(Optional.empty());
        when(accountServiceClient.getAccountVerification(accountId)).thenReturn(createValidAccount());
        when(customerServiceClient.getAddressVerification(addressId)).thenReturn(createValidAddress());
        when(cardApplicationRepository.existsByCustomerIdAndLinkedAccountIdAndCardTypeAndStatusIn(
                eq(customerId), eq(accountId), eq("CREDIT"), any())).thenReturn(true);

        assertThrows(CardApplicationAlreadyExistsException.class, () ->
                cardApplicationService.applyForCard(customerId, "idem-001", request));
    }

    @Test
    @DisplayName("Customer cannot view another customer's card application (AccessDeniedException 403)")
    void testGetApplicationById_DifferentCustomer_ThrowsAccessDenied() {
        CardApplication app = new CardApplication();
        app.setCardApplicationId("CARD-APP-123");
        app.setCustomerId("CUS-OTHER");
        app.setIdentitySubject("sub-other");

        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-123")).thenReturn(Optional.of(app));

        assertThrows(AccessDeniedException.class, () ->
                cardApplicationService.getApplicationById(customerId, "CARD-APP-123", false));
    }

    @Test
    @DisplayName("Customer can view their own card application matching identitySubject")
    void testGetApplicationById_MatchingIdentitySubject_Allowed() {
        CardApplication app = new CardApplication();
        app.setCardApplicationId("CARD-APP-123");
        app.setCustomerId("CUS-999");
        app.setIdentitySubject(customerId);
        app.setCardType("CREDIT");
        app.setStatus("PENDING_APPROVAL");

        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-123")).thenReturn(Optional.of(app));

        CardApplicationResponse response = cardApplicationService.getApplicationById(customerId, "CARD-APP-123", false);

        assertNotNull(response);
        assertEquals("CARD-APP-123", response.getCardApplicationId());
        assertEquals(customerId, response.getIdentitySubject());
    }

    @Test
    @DisplayName("Get customer applications queries by identitySubject or customerId")
    void testGetCustomerApplications_QueriesByIdentitySubject() {
        CardApplication app = new CardApplication();
        app.setCardApplicationId("CARD-APP-123");
        app.setCustomerId(customerId);
        app.setIdentitySubject(customerId);
        app.setCardType("CREDIT");
        app.setStatus("PENDING_APPROVAL");

        when(cardApplicationRepository.findByIdentitySubjectOrCustomerIdOrderByCreatedAtDesc(customerId, customerId))
                .thenReturn(List.of(app));

        List<CardApplicationResponse> list = cardApplicationService.getCustomerApplications(customerId);

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals(customerId, list.get(0).getIdentitySubject());
    }

    @Test
    @DisplayName("Staff can view any card application")
    void testGetApplicationById_StaffCanView() {
        CardApplication app = new CardApplication();
        app.setCardApplicationId("CARD-APP-123");
        app.setCustomerId("CUS-OTHER");
        app.setIdentitySubject("sub-other");
        app.setCardType("CREDIT");
        app.setStatus("PENDING_APPROVAL");

        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-123")).thenReturn(Optional.of(app));

        CardApplicationResponse response = cardApplicationService.getApplicationById(customerId, "CARD-APP-123", true);

        assertNotNull(response);
        assertEquals("CARD-APP-123", response.getCardApplicationId());
    }

    @Test
    @DisplayName("Approve application issues card and enqueues CARD_APPLICATION_APPROVED and CARD_ISSUED events")
    void testOpsApproveApplication_IssuesCardAndEnqueuesEvents() {
        CardApplication app = new CardApplication();
        app.setCardApplicationId("CARD-APP-APPROVED-1");
        app.setCustomerId(customerId);
        app.setCardType("CREDIT");
        app.setLinkedAccountId(accountId);
        app.setDeliveryAddressId(addressId);
        app.setRequestedLimit(new BigDecimal("50000.00"));
        app.setStatus("PENDING_APPROVAL");

        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-APPROVED-1")).thenReturn(Optional.of(app));

        ApproveCardApplicationRequest req = new ApproveCardApplicationRequest();
        req.setApprovedLimit(new BigDecimal("75000.00"));

        OpsCardApplicationResponse response = cardApplicationService.approveApplication("CARD-APP-APPROVED-1", req);

        assertNotNull(response);
        assertEquals("APPROVED", response.getStatus());
        assertEquals(new BigDecimal("75000.00"), response.getApprovedLimit());

        verify(cardRepository).save(any(Card.class));
        verify(outboxEventService).enqueueEvent(eq("CARD-APP-APPROVED-1"), eq("CARD_APPLICATION"), eq("CARD_APPLICATION_APPROVED"), any());
        verify(outboxEventService).enqueueEvent(any(), eq("CARD"), eq("CARD_ISSUED"), any());
    }

    @Test
    @DisplayName("Reject application updates status and enqueues CARD_APPLICATION_REJECTED event")
    void testOpsRejectApplication_UpdatesStatusAndEnqueuesEvent() {
        CardApplication app = new CardApplication();
        app.setCardApplicationId("CARD-APP-REJECT-1");
        app.setCustomerId(customerId);
        app.setCardType("CREDIT");
        app.setLinkedAccountId(accountId);
        app.setStatus("PENDING_APPROVAL");

        when(cardApplicationRepository.findByCardApplicationId("CARD-APP-REJECT-1")).thenReturn(Optional.of(app));

        RejectCardApplicationRequest req = new RejectCardApplicationRequest();
        req.setRemarks("Low credit score");

        OpsCardApplicationResponse response = cardApplicationService.rejectApplication("CARD-APP-REJECT-1", req);

        assertNotNull(response);
        assertEquals("REJECTED", response.getStatus());
        assertEquals("Low credit score", response.getRejectionReason());

        verify(cardRepository, never()).save(any());
        verify(outboxEventService).enqueueEvent(eq("CARD-APP-REJECT-1"), eq("CARD_APPLICATION"), eq("CARD_APPLICATION_REJECTED"), any());
    }
}
