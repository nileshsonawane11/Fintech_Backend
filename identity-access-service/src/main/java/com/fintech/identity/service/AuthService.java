package com.fintech.identity.service;

import com.fintech.identity.dto.request.*;
import com.fintech.identity.dto.response.*;
import com.fintech.events.CustomerRegisteredEvent;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.*;
import com.fintech.identity.repository.CustomerProfileRepository;
import com.fintech.identity.repository.RoleRepository;
import com.fintech.identity.repository.UserRoleRepository;
import com.fintech.identity.model.enums.CustomerStatus;
import com.fintech.identity.model.enums.OtpPurpose;
import com.fintech.identity.repository.CustomerRepository;
import com.fintech.identity.repository.RefreshTokenRepository;
import com.fintech.identity.security.JwtService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;

@Service
public class AuthService {

    private final CustomerRepository customerRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final JwtService jwtService;

    private final CustomerProfileRepository customerProfileRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            CustomerRepository customerRepository,
            RefreshTokenRepository refreshTokenRepository,
            ApplicationEventPublisher applicationEventPublisher,
            PasswordEncoder passwordEncoder,
            OtpService otpService,
            JwtService jwtService,
            CustomerProfileRepository customerProfileRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository
    ) {
        this.customerRepository = customerRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.applicationEventPublisher = applicationEventPublisher;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.customerProfileRepository = customerProfileRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String mobile = request.mobileNumber().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (customerRepository.existsByMobileNumber(mobile)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "MOBILE_ALREADY_REGISTERED",
                    "Mobile number is already registered."
            );
        }

        if (customerRepository.existsByEmail(email)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_REGISTERED",
                    "Email address is already registered."
            );
        }

        Customer customer = new Customer(
                mobile,
                email,
                passwordEncoder.encode(request.password()),
                request.acceptedTermsVersion().trim(),
                request.marketingConsent()
        );

        customer.activate();
        Customer saved = customerRepository.saveAndFlush(customer);

        if (customerProfileRepository != null) {
            customerProfileRepository.save(new CustomerProfile(saved.getId()));
        }

        if (roleRepository != null && userRoleRepository != null) {
            RoleEntity role = roleRepository.findByName("CUSTOMER")
                    .orElseGet(() -> roleRepository.save(new RoleEntity("CUSTOMER", "Bank customer")));
            userRoleRepository.save(new UserRole(saved.getId(), role.getId(), null));
        }

//        OtpChallenge challenge = otpService.create(
////                saved,
////                OtpPurpose.REGISTRATION,
////                saved.getMobileNumber()
////        );

        applicationEventPublisher.publishEvent(
                new CustomerRegisteredEvent(
                        saved.getId(),
                        Instant.now()
                )
        );

        return new RegisterResponse(
                saved.getId(),
                maskMobile(saved.getMobileNumber()),
                maskEmail(saved.getEmail()),
                saved.getStatus().name(),
                true
//                "VERIFY_OTP",
//                challenge.getReferenceId()
        );
    }

    @Transactional
    public OtpVerificationResponse verifyRegistrationOtp(
            VerifyOtpRequest request
    ) {
        OtpChallenge challenge = otpService.verifyAndConsume(
                request.referenceId(),
                request.otp(),
                OtpPurpose.REGISTRATION
        );

        Customer customer = challenge.getCustomer();

        if (customer == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OTP",
                    "Registration challenge is invalid."
            );
        }

        if (customer.getStatus() != CustomerStatus.PENDING_VERIFICATION) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OTP",
                    "Customer is not awaiting registration verification."
            );
        }

        customer.activate();
        customerRepository.save(customer);

        if (customerProfileRepository != null && !customerProfileRepository.existsById(customer.getId())) {
            customerProfileRepository.save(new CustomerProfile(customer.getId()));
        }

        if (roleRepository != null && userRoleRepository != null) {
            RoleEntity role = roleRepository.findByName("CUSTOMER")
                    .orElseGet(() -> roleRepository.save(new RoleEntity("CUSTOMER", "Bank customer")));
            if (!userRoleRepository.existsByIdUserIdAndIdRoleId(customer.getId(), role.getId())) {
                userRoleRepository.save(new UserRole(customer.getId(), role.getId(), null));
            }
        }

        return new OtpVerificationResponse(
                true,
                challenge.getReferenceId(),
                OtpPurpose.REGISTRATION.name()
        );
    }

    public TokenResponse login(LoginRequest request) {
        String identifier = request.identifier().trim();

        Customer customer;

        if (identifier.contains("@")) {
            customer = customerRepository
                    .findByEmail(identifier.toLowerCase(Locale.ROOT))
                    .orElseThrow(this::invalidCredentials);
        } else {
            customer = customerRepository
                    .findByMobileNumber(identifier)
                    .orElseThrow(this::invalidCredentials);
        }

        if (customer.isLockedNow()) {
            throw new ApiException(
                    HttpStatus.LOCKED,
                    "ACCOUNT_LOCKED",
                    "Account is temporarily locked."
            );
        }

        if (customer.getLockedUntil() != null) {
            customer.resetFailedLogins();
            customerRepository.save(customer);
        }

        if (!passwordEncoder.matches(
                request.password(),
                customer.getPasswordHash()
        )) {
            customer.recordFailedLogin();
            customerRepository.saveAndFlush(customer);

            if (customer.isLockedNow()) {
                throw new ApiException(
                        HttpStatus.LOCKED,
                        "ACCOUNT_LOCKED",
                        "Account is temporarily locked."
                );
            }

            throw invalidCredentials();
        }

        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw invalidCredentials();
        }

        customer.resetFailedLogins();
        customerRepository.save(customer);

//        OtpChallenge challenge = otpService.create(
//                customer,
//                OtpPurpose.LOGIN_MFA,
//                customer.getMobileNumber()
//        );

//        String temporaryToken = jwtService.createMfaToken(
//                customer,
//                challenge.getReferenceId()
//        );
//
//        return new LoginResponse(
//                "Bearer",
//                300,
//                true,
//                challenge.getReferenceId(),
//                temporaryToken
//        );

        String accessToken = jwtService.createAccessToken(customer);
        String refreshToken = generateRefreshToken();

        RefreshToken savedToken = new RefreshToken(
                customer,
                hashToken(refreshToken),
                Instant.now().plusSeconds(30L * 24 * 60 * 60)
        );

        refreshTokenRepository.save(savedToken);

        return new TokenResponse(
                accessToken,
                refreshToken,
                "Bearer",
                jwtService.getAccessTokenSeconds(),
                customer.getId()
        );
    }

    @Transactional
    public TokenResponse verifyMfa(
            VerifyMfaRequest request,
            Jwt temporaryJwt
    ) {
        if (!"MFA".equals(temporaryJwt.getClaimAsString("token_use"))) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_MFA_TOKEN",
                    "A temporary MFA token is required."
            );
        }

        String tokenReference =
                temporaryJwt.getClaimAsString("mfa_reference_id");

        if (tokenReference == null
                || !tokenReference.equals(request.mfaReferenceId())) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_MFA_TOKEN",
                    "MFA reference does not match the token."
            );
        }

        OtpChallenge challenge = otpService.verifyAndConsume(
                request.mfaReferenceId(),
                request.otp(),
                OtpPurpose.LOGIN_MFA
        );

        Customer customer = challenge.getCustomer();

        if (customer == null
                || !customer.getId().toString().equals(
                temporaryJwt.getSubject())) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_MFA_TOKEN",
                    "MFA challenge does not match the authenticated customer."
            );
        }

        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw invalidCredentials();
        }

        String accessToken = jwtService.createAccessToken(customer);
        String refreshToken = generateRefreshToken();

        RefreshToken savedToken = new RefreshToken(
                customer,
                hashToken(refreshToken),
                Instant.now().plusSeconds(30L * 24 * 60 * 60)
        );

        refreshTokenRepository.save(savedToken);

        return new TokenResponse(
                accessToken,
                refreshToken,
                "Bearer",
                jwtService.getAccessTokenSeconds(),
                customer.getId()
        );
    }

    private String generateRefreshToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));

            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Unable to hash refresh token.", ex
            );
        }
    }

    private ApiException invalidCredentials() {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Invalid credentials."
        );
    }

    private String maskMobile(String mobile) {
        return "******" + mobile.substring(mobile.length() - 5);
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');

        if (at <= 0) {
            return "***";
        }

        String local = email.substring(0, at);
        String domain = email.substring(at + 1);

        return local.substring(0, 1) + "***@" + domain;
    }
}