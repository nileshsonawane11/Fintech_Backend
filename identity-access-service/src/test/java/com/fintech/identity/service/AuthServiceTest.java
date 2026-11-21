package com.fintech.identity.service;

import com.fintech.events.CustomerRegisteredEvent;
import com.fintech.identity.dto.request.ApplicantIdentityRequest;
import com.fintech.identity.dto.request.IdentityMatchRequest;
import com.fintech.identity.dto.request.LoginRequest;
import com.fintech.identity.dto.request.RegisterRequest;
import com.fintech.identity.dto.request.VerifyMfaRequest;
import com.fintech.identity.dto.request.VerifyOtpRequest;
import com.fintech.identity.dto.response.IdentityMatchResponse;
import com.fintech.identity.dto.response.OtpVerificationResponse;
import com.fintech.identity.dto.response.RegisterResponse;
import com.fintech.identity.dto.response.TokenResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.*;
import com.fintech.identity.model.enums.CustomerStatus;
import com.fintech.identity.model.enums.OtpPurpose;
import com.fintech.identity.model.enums.Role;
import com.fintech.identity.repository.CustomerProfileRepository;
import com.fintech.identity.repository.CustomerRepository;
import com.fintech.identity.repository.RefreshTokenRepository;
import com.fintech.identity.repository.RoleRepository;
import com.fintech.identity.repository.UserRoleRepository;
import com.fintech.identity.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private CustomerRepository customerRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private ApplicationEventPublisher eventPublisher;
    private PasswordEncoder passwordEncoder;
    private OtpService otpService;
    private JwtService jwtService;
    private CustomerProfileRepository customerProfileRepository;
    private RoleRepository roleRepository;
    private UserRoleRepository userRoleRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        customerRepository = mock(CustomerRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        passwordEncoder = mock(PasswordEncoder.class);
        otpService = mock(OtpService.class);
        jwtService = mock(JwtService.class);
        customerProfileRepository = mock(CustomerProfileRepository.class);
        roleRepository = mock(RoleRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);

        authService = new AuthService(
                customerRepository,
                refreshTokenRepository,
                eventPublisher,
                passwordEncoder,
                otpService,
                jwtService,
                customerProfileRepository,
                roleRepository,
                userRoleRepository
        );
    }

    @Test
    @DisplayName("Customer registration assigns CUSTOMER role and creates customer profile")
    void testCustomerRegistrationAssignsRoleAndProfile() {
        RegisterRequest request = new RegisterRequest(
                "Test User",
                "9876543210",
                "test@example.com",
                "Password123!",
                "TERMS_V1",
                true
        );

        when(customerRepository.existsByMobileNumber("9876543210")).thenReturn(false);
        when(customerRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed_pass");

        Customer savedCustomer = new Customer(
                "9876543210",
                "test@example.com",
                "hashed_pass",
                "TERMS_V1",
                true
        );
        savedCustomer.activate();
        when(customerRepository.saveAndFlush(any())).thenReturn(savedCustomer);

        RoleEntity customerRole = new RoleEntity("CUSTOMER", "Bank customer");
        when(roleRepository.findByName("CUSTOMER")).thenReturn(Optional.of(customerRole));

        RegisterResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("ACTIVE", response.status());
        verify(customerProfileRepository).save(any(CustomerProfile.class));
        verify(userRoleRepository).save(any(UserRole.class));
        verify(eventPublisher).publishEvent(any(CustomerRegisteredEvent.class));
    }

    @Test
    @DisplayName("Customer login successfully generates JWT and refresh token")
    void testCustomerLogin() {
        LoginRequest request = new LoginRequest("test@example.com", "Password123!", Role.CUSTOMER);

        Customer customer = new Customer(
                "9876543210",
                "test@example.com",
                "hashed_pass",
                "TERMS_V1",
                true
        );
        customer.activate();

        when(customerRepository.findByEmailAndRole("test@example.com", Role.CUSTOMER)).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("Password123!", "hashed_pass")).thenReturn(true);
        when(jwtService.createAccessToken(customer)).thenReturn("mock_jwt_access_token");
        when(jwtService.getAccessTokenSeconds()).thenReturn(1800L);

        TokenResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock_jwt_access_token", response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals(1800L, response.expiresIn());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Existing OTP verification for registration")
    void testOtpVerification() {
        VerifyOtpRequest request = new VerifyOtpRequest("REF-123", "123456", OtpPurpose.REGISTRATION);

        Customer customer = new Customer(
                "9876543210",
                "test@example.com",
                "hashed_pass",
                "TERMS_V1",
                true
        );

        OtpChallenge challenge = new OtpChallenge(
                "REF-123",
                customer,
                OtpPurpose.REGISTRATION,
                "hashed_code",
                Instant.now().plusSeconds(300),
                5
        );

        when(otpService.verifyAndConsume("REF-123", "123456", OtpPurpose.REGISTRATION))
                .thenReturn(challenge);

        RoleEntity customerRole = new RoleEntity("CUSTOMER", "Bank customer");
        when(roleRepository.findByName("CUSTOMER")).thenReturn(Optional.of(customerRole));

        OtpVerificationResponse response = authService.verifyRegistrationOtp(request);

        assertTrue(response.verified());
        assertEquals("REF-123", response.referenceId());
        assertEquals(CustomerStatus.ACTIVE, customer.getStatus());
        verify(customerRepository).save(customer);
    }

    @Test
    @DisplayName("Existing MFA verification")
    void testMfaVerification() {
        UUID customerId = UUID.randomUUID();
        VerifyMfaRequest request = new VerifyMfaRequest("MFA-123", "123456");

        Jwt jwt = mock(Jwt.class);
        when(jwt.getClaimAsString("token_use")).thenReturn("MFA");
        when(jwt.getClaimAsString("mfa_reference_id")).thenReturn("MFA-123");
        when(jwt.getSubject()).thenReturn(customerId.toString());

        Customer customer = new Customer(
                "9876543210",
                "test@example.com",
                "hashed_pass",
                "TERMS_V1",
                true
        );
        customer.activate();

        OtpChallenge challenge = new OtpChallenge(
                "MFA-123",
                customer,
                OtpPurpose.LOGIN_MFA,
                "code_hash",
                Instant.now().plusSeconds(300),
                5
        );

        // Reflectively or indirectly set ID
        try {
            var field = Customer.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(customer, customerId);
        } catch (Exception ignored) {}

        when(otpService.verifyAndConsume("MFA-123", "123456", OtpPurpose.LOGIN_MFA))
                .thenReturn(challenge);
        when(jwtService.createAccessToken(customer)).thenReturn("access_token_mfa");
        when(jwtService.getAccessTokenSeconds()).thenReturn(1800L);

        TokenResponse tokenResponse = authService.verifyMfa(request, jwt);

        assertNotNull(tokenResponse);
        assertEquals("access_token_mfa", tokenResponse.accessToken());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("matchIdentity returns matched when both mobile and email match same customer")
    void testMatchIdentity_BothMatchSameIdentity() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer("9876543210", "test@example.com", "pass", "TERMS", true);
        try {
            var field = Customer.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(customer, customerId);
        } catch (Exception ignored) {}

        when(customerRepository.findByMobileNumber("9876543210")).thenReturn(Optional.of(customer));
        when(customerRepository.findByEmail("test@example.com")).thenReturn(Optional.of(customer));

        IdentityMatchResponse response = authService.matchIdentity(new IdentityMatchRequest("9876543210", "test@example.com"));

        assertNotNull(response);
        assertTrue(response.matched());
        assertEquals(customerId, response.identityId());
        assertEquals("9876543210", response.mobileNumber());
        assertEquals("test@example.com", response.email());
    }

    @Test
    @DisplayName("matchIdentity returns matched when only mobile matches")
    void testMatchIdentity_OnlyMobileMatches() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer("9876543210", "old@example.com", "pass", "TERMS", true);
        try {
            var field = Customer.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(customer, customerId);
        } catch (Exception ignored) {}

        when(customerRepository.findByMobileNumber("9876543210")).thenReturn(Optional.of(customer));
        when(customerRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());

        IdentityMatchResponse response = authService.matchIdentity(new IdentityMatchRequest("9876543210", "new@example.com"));

        assertNotNull(response);
        assertTrue(response.matched());
        assertEquals(customerId, response.identityId());
    }

    @Test
    @DisplayName("matchIdentity returns matched when only email matches")
    void testMatchIdentity_OnlyEmailMatches() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer("9999999999", "test@example.com", "pass", "TERMS", true);
        try {
            var field = Customer.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(customer, customerId);
        } catch (Exception ignored) {}

        when(customerRepository.findByMobileNumber("9876543210")).thenReturn(Optional.empty());
        when(customerRepository.findByEmail("test@example.com")).thenReturn(Optional.of(customer));

        IdentityMatchResponse response = authService.matchIdentity(new IdentityMatchRequest("9876543210", "test@example.com"));

        assertNotNull(response);
        assertTrue(response.matched());
        assertEquals(customerId, response.identityId());
    }

    @Test
    @DisplayName("matchIdentity returns no match when neither mobile nor email match")
    void testMatchIdentity_NeitherMatches() {
        when(customerRepository.findByMobileNumber("9876543210")).thenReturn(Optional.empty());
        when(customerRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        IdentityMatchResponse response = authService.matchIdentity(new IdentityMatchRequest("9876543210", "test@example.com"));

        assertNotNull(response);
        assertFalse(response.matched());
        assertNull(response.identityId());
    }

    @Test
    @DisplayName("matchIdentity throws 409 Conflict when mobile and email match different identities")
    void testMatchIdentity_ConflictDifferentIdentities_ThrowsException() {
        UUID customerId1 = UUID.randomUUID();
        UUID customerId2 = UUID.randomUUID();

        Customer customer1 = new Customer("9876543210", "cust1@example.com", "pass", "TERMS", true);
        Customer customer2 = new Customer("9123456780", "cust2@example.com", "pass", "TERMS", true);
        try {
            var field = Customer.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(customer1, customerId1);
            field.set(customer2, customerId2);
        } catch (Exception ignored) {}

        when(customerRepository.findByMobileNumber("9876543210")).thenReturn(Optional.of(customer1));
        when(customerRepository.findByEmail("cust2@example.com")).thenReturn(Optional.of(customer2));

        ApiException ex = assertThrows(ApiException.class, () ->
                authService.matchIdentity(new IdentityMatchRequest("9876543210", "cust2@example.com")));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("IDENTITY_CONFLICT", ex.getCode());
    }

    @Test
    @DisplayName("createApplicantIdentity creates pending verification identity when applicant does not exist")
    void testCreateApplicantIdentity_WhenNotExists_CreatesNewCustomerPendingVerification() {
        when(customerRepository.findByMobileNumber("9876543210")).thenReturn(Optional.empty());
        when(customerRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        when(passwordEncoder.encode(any())).thenReturn("hashed_dummy");
        when(customerRepository.saveAndFlush(any(Customer.class))).thenAnswer(inv -> {
            Customer c = inv.getArgument(0);
            try {
                var field = Customer.class.getDeclaredField("id");
                field.setAccessible(true);
                field.set(c, UUID.randomUUID());
            } catch (Exception ignored) {}
            return c;
        });

        ApplicantIdentityRequest request = new ApplicantIdentityRequest("Pooja Patel", "9876543210", "test@example.com");
        IdentityMatchResponse response = authService.createApplicantIdentity(request);

        assertNotNull(response);
        assertTrue(response.matched());
        assertEquals("PENDING_VERIFICATION", response.status());
        verify(customerRepository).saveAndFlush(any(Customer.class));
    }

    @Test
    @DisplayName("createApplicantIdentity reuses existing identity if already registered")
    void testCreateApplicantIdentity_WhenAlreadyExists_ReusesExisting() {
        UUID existingId = UUID.randomUUID();
        Customer existing = new Customer("9876543210", "test@example.com", "pass", "TERMS", true);
        try {
            var field = Customer.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(existing, existingId);
        } catch (Exception ignored) {}

        when(customerRepository.findByMobileNumber("9876543210")).thenReturn(Optional.of(existing));
        when(customerRepository.findByEmail("test@example.com")).thenReturn(Optional.of(existing));

        ApplicantIdentityRequest request = new ApplicantIdentityRequest("Pooja Patel", "9876543210", "test@example.com");
        IdentityMatchResponse response = authService.createApplicantIdentity(request);

        assertNotNull(response);
        assertTrue(response.matched());
        assertEquals(existingId, response.identityId());
        verify(customerRepository, never()).saveAndFlush(any());
    }
}
