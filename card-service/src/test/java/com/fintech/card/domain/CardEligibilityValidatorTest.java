package com.fintech.card.domain;

import com.fintech.card.client.dto.AccountVerificationDto;
import com.fintech.card.client.dto.AddressVerificationDto;
import com.fintech.card.client.dto.CustomerProfileDto;
import com.fintech.card.exception.AccountNotEligibleException;
import com.fintech.card.exception.AccountOwnershipMismatchException;
import com.fintech.card.exception.AddressNotDeliverableException;
import com.fintech.card.exception.AddressOwnershipMismatchException;
import com.fintech.card.repository.CardApplicationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CardEligibilityValidatorTest {

    @Mock
    private CardApplicationRepository cardApplicationRepository;

    private CardEligibilityValidator validator;
    private final String customerId = "CUS-100234";
    private final String accountId = "ACC-1001";
    private final UUID addressId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        CardProductCatalog catalog = new CardProductCatalog();
        validator = new CardEligibilityValidator(cardApplicationRepository, catalog);
    }

    private CanonicalCardApplication createValidApplication() {
        return new CanonicalCardApplication(
                "CREDIT",
                "FinEdge Edge Cashback Card",
                "edge-cashback-credit",
                accountId,
                addressId.toString(),
                new BigDecimal("50000.00"),
                "Vikramaditya Sharma",
                "FNEGS1023K",
                new BigDecimal("1200000.00"),
                new BigDecimal("100000.00"),
                null
        );
    }

    private AccountVerificationDto createAccount(String owner, String status, String type) {
        return new AccountVerificationDto(
                accountId, "****1234", owner, owner, type, "PRD-SAV", status, "INR", Instant.now()
        );
    }

    private AddressVerificationDto createAddress(String owner, String status, boolean deliverable) {
        return new AddressVerificationDto(
                addressId, owner, owner, "RESIDENTIAL", "123 MG Road", null,
                "Bangalore", "Karnataka", "560001", "India", status, deliverable, Instant.now()
        );
    }

    @Test
    @DisplayName("All conditions A, B, C, D satisfied -> validation passes")
    void testValidateEligibility_Success() {
        when(cardApplicationRepository.existsByCustomerIdAndLinkedAccountIdAndCardTypeAndStatusIn(any(), any(), any(), any()))
                .thenReturn(false);

        AccountVerificationDto account = createAccount(customerId, "ACTIVE", "SAVINGS");
        AddressVerificationDto address = createAddress(customerId, "ACTIVE", true);
        CustomerProfileDto profile = new CustomerProfileDto(customerId, "Vikramaditya", LocalDate.now().minusYears(25),
                "******1234", "v***@gmail.com", "*****1234K", "APPROVED", "LOW", "MALE");

        assertDoesNotThrow(() -> validator.validateEligibility(
                customerId, customerId, createValidApplication(), account, address, profile
        ));
    }

    @Test
    @DisplayName("Condition D fails: Account belongs to someone else -> AccountOwnershipMismatchException (403)")
    void testValidateEligibility_AccountOwnershipMismatch() {
        AccountVerificationDto account = createAccount("CUS-OTHER", "ACTIVE", "SAVINGS");
        AddressVerificationDto address = createAddress(customerId, "ACTIVE", true);

        assertThrows(AccountOwnershipMismatchException.class, () -> validator.validateEligibility(
                customerId, customerId, createValidApplication(), account, address, null
        ));
    }

    @Test
    @DisplayName("Condition D fails: Address belongs to someone else -> AddressOwnershipMismatchException (403)")
    void testValidateEligibility_AddressOwnershipMismatch() {
        AccountVerificationDto account = createAccount(customerId, "ACTIVE", "SAVINGS");
        AddressVerificationDto address = createAddress("CUS-OTHER", "ACTIVE", true);

        assertThrows(AddressOwnershipMismatchException.class, () -> validator.validateEligibility(
                customerId, customerId, createValidApplication(), account, address, null
        ));
    }

    @Test
    @DisplayName("Account status not ACTIVE -> AccountNotEligibleException (422)")
    void testValidateEligibility_IneligibleAccountStatus() {
        AccountVerificationDto account = createAccount(customerId, "BLOCKED", "SAVINGS");
        AddressVerificationDto address = createAddress(customerId, "ACTIVE", true);

        assertThrows(AccountNotEligibleException.class, () -> validator.validateEligibility(
                customerId, customerId, createValidApplication(), account, address, null
        ));
    }

    @Test
    @DisplayName("Address deliverable = false -> AddressNotDeliverableException (422)")
    void testValidateEligibility_AddressNotDeliverable() {
        AccountVerificationDto account = createAccount(customerId, "ACTIVE", "SAVINGS");
        AddressVerificationDto address = createAddress(customerId, "ACTIVE", false);

        assertThrows(AddressNotDeliverableException.class, () -> validator.validateEligibility(
                customerId, customerId, createValidApplication(), account, address, null
        ));
    }

    @Test
    @DisplayName("Address status INACTIVE -> AddressNotDeliverableException (422)")
    void testValidateEligibility_AddressInactive() {
        AccountVerificationDto account = createAccount(customerId, "ACTIVE", "SAVINGS");
        AddressVerificationDto address = createAddress(customerId, "INACTIVE", true);

        assertThrows(AddressNotDeliverableException.class, () -> validator.validateEligibility(
                customerId, customerId, createValidApplication(), account, address, null
        ));
    }

    @Test
    @DisplayName("Condition D: Matching identitySubject across account and address -> validation passes")
    void testValidateEligibility_MatchingIdentitySubject_Success() {
        when(cardApplicationRepository.existsByCustomerIdAndLinkedAccountIdAndCardTypeAndStatusIn(any(), any(), any(), any()))
                .thenReturn(false);

        String jwtSubject = "auth0|user-sub-12345";
        AccountVerificationDto account = new AccountVerificationDto(
                accountId, "****1234", "CUS-9999", jwtSubject, "SAVINGS", "PRD-SAV", "ACTIVE", "INR", Instant.now()
        );
        AddressVerificationDto address = new AddressVerificationDto(
                addressId, "CUS-9999", jwtSubject, "RESIDENTIAL", "123 MG Road", null,
                "Bangalore", "Karnataka", "560001", "India", "ACTIVE", true, Instant.now()
        );

        assertDoesNotThrow(() -> validator.validateEligibility(
                "CUS-9999", jwtSubject, createValidApplication(), account, address, null
        ));
    }

    @Test
    @DisplayName("Customer KYC status REJECTED -> AccountNotEligibleException (422)")
    void testValidateEligibility_KycNotApproved() {
        AccountVerificationDto account = createAccount(customerId, "ACTIVE", "SAVINGS");
        AddressVerificationDto address = createAddress(customerId, "ACTIVE", true);
        CustomerProfileDto profile = new CustomerProfileDto(customerId, "Vikramaditya", LocalDate.now().minusYears(25),
                "******1234", "v***@gmail.com", "*****1234K", "REJECTED", "HIGH", "MALE");

        assertThrows(AccountNotEligibleException.class, () -> validator.validateEligibility(
                customerId, customerId, createValidApplication(), account, address, profile
        ));
    }
}
