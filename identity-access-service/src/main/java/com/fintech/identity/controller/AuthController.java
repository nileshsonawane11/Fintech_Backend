package com.fintech.identity.controller;

import com.fintech.identity.dto.request.*;
import com.fintech.identity.dto.response.*;
import com.fintech.identity.service.AuthService;
import com.fintech.identity.service.RefreshTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Endpoints for customer registration, authentication, OTP verification, MFA verification, and JWT refresh tokens")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    public AuthController(AuthService authService, RefreshTokenService refreshTokenService) {
        this.authService = authService;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register New Customer", description = "Register a new customer account and initiate OTP verification")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Customer registered successfully and OTP generated"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation error"),
            @ApiResponse(responseCode = "409", description = "Customer email or mobile already registered")
    })
    public RegisterResponse register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return authService.register(request);
    }

    @PostMapping("/otp/verify")
    @Operation(summary = "Verify Registration OTP", description = "Verify one-time passcode to activate a customer account")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "OTP verified and account activated"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired OTP"),
            @ApiResponse(responseCode = "404", description = "Registration session not found")
    })
    public OtpVerificationResponse verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        return authService.verifyRegistrationOtp(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Customer Login", description = "Authenticate credentials and issue JWT tokens or MFA challenge")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated successfully, returns access token or MFA requirement"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    public TokenResponse login(
            @Valid @RequestBody LoginRequest request
    ) {
        return authService.login(request);
    }

    @PostMapping("/mfa/verify")
    @Operation(summary = "Verify MFA Code", description = "Verify multi-factor authentication passcode to obtain final JWT access token")
    @SecurityRequirement(name = "BearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "MFA code verified, access token issued"),
            @ApiResponse(responseCode = "401", description = "Invalid or expired MFA token or code")
    })
    public TokenResponse verifyMfa(
            @Valid @RequestBody VerifyMfaRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ) {
        return authService.verifyMfa(request, jwt);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate Refresh Token", description = "Exchange a valid refresh token for a newly issued access token and refreshed refresh token")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
            @ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")
    })
    public ResponseEntity<TokenResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        return ResponseEntity.ok(
                refreshTokenService.rotate(request.refreshToken())
        );
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change Password", description = "Set new password using old password")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password Changed successfully"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    public ResponseEntity<PasswordChangedResponse> changePassword(
            @Valid @RequestBody PasswordChangedRequest passwordChangedRequest,
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt
    ){
        String IdentitySubject = jwt.getSubject();
        return ResponseEntity.ok(
                authService.changePassword(passwordChangedRequest, IdentitySubject)
        );
    }

    @PostMapping("/identities/match")
    @Operation(summary = "Match Identity", description = "Check if an identity exists by mobile number or email according to credential matching rules")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Match query completed"),
            @ApiResponse(responseCode = "409", description = "Mobile number and email belong to different identities")
    })
    public ResponseEntity<IdentityMatchResponse> matchIdentity(
            @Valid @RequestBody IdentityMatchRequest request
    ) {
        return ResponseEntity.ok(authService.matchIdentity(request));
    }

    @PostMapping("/identities/applicant")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create Applicant Identity", description = "Create an uncredentialed applicant identity with pending verification status")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Applicant identity created successfully"),
            @ApiResponse(responseCode = "409", description = "Mobile or email conflict")
    })
    public ResponseEntity<IdentityMatchResponse> createApplicantIdentity(
            @Valid @RequestBody ApplicantIdentityRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.createApplicantIdentity(request));
    }
}
