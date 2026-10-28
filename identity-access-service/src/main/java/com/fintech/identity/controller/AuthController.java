package com.fintech.identity.controller;

import com.fintech.identity.dto.request.*;
import com.fintech.identity.dto.response.LoginResponse;
import com.fintech.identity.dto.response.OtpVerificationResponse;
import com.fintech.identity.dto.response.RegisterResponse;
import com.fintech.identity.dto.response.TokenResponse;
import com.fintech.identity.service.AuthService;
import com.fintech.identity.service.RefreshTokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    public AuthController(AuthService authService, RefreshTokenService refreshTokenService) {
        this.authService = authService;
        this.refreshTokenService = refreshTokenService;
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
    public TokenResponse login(
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

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        return ResponseEntity.ok(
                refreshTokenService.rotate(request.refreshToken())
        );
    }
}