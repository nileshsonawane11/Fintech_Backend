package com.fintech.identity.controller;

import com.fintech.identity.dto.request.LoginRequest;
import com.fintech.identity.dto.request.RegisterRequest;
import com.fintech.identity.dto.request.VerifyMfaRequest;
import com.fintech.identity.dto.request.VerifyOtpRequest;
import com.fintech.identity.dto.response.LoginResponse;
import com.fintech.identity.dto.response.OtpVerificationResponse;
import com.fintech.identity.dto.response.RegisterResponse;
import com.fintech.identity.dto.response.TokenResponse;
import com.fintech.identity.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return authService.register(request);
    }

    @PostMapping("/otp/verify")
    public OtpVerificationResponse verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        return authService.verifyRegistrationOtp(request);
    }

    @PostMapping("/login")
    public LoginResponse login(
            @Valid @RequestBody LoginRequest request
    ) {
        return authService.login(request);
    }

    @PostMapping("/mfa/verify")
    public TokenResponse verifyMfa(
            @Valid @RequestBody VerifyMfaRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return authService.verifyMfa(request, jwt);
    }
}