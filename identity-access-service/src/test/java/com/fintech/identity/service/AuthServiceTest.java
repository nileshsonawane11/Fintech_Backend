package com.fintech.identity.service;

import com.fintech.events.CustomerRegisteredEvent;
import com.fintech.identity.dto.request.LoginRequest;
import com.fintech.identity.dto.request.RegisterRequest;
import com.fintech.identity.dto.request.VerifyMfaRequest;
import com.fintech.identity.dto.request.VerifyOtpRequest;
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
        LoginRequest request = new LoginRequest("test@example.com", "Password123!");

        Customer customer = new Customer(
                "9876543210",
                "test@example.com",
                "hashed_pass",
                "TERMS_V1",
                true
        );
        customer.activate();

        when(customerRepository.findByEmail("test@example.com")).thenReturn(Optional.of(customer));
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
}
