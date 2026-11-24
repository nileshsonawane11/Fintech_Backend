package com.fintech.customer.controller;

import com.fintech.customer.dto.request.KycApplicationRequest;
import com.fintech.customer.dto.response.KycApplicationResponse;
import com.fintech.customer.service.KycApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/me/kyc")
@Tag(name = "KYC Applications", description = "Endpoints for customer KYC identity verification applications and history")
@SecurityRequirement(name = "BearerAuth")
public class KycApplicationController {

    private final KycApplicationService kycApplicationService;

    public KycApplicationController(KycApplicationService kycApplicationService) {
        this.kycApplicationService = kycApplicationService;
    }

    @PostMapping
    @Operation(summary = "Submit KYC Application", description = "Submit identity details, residential address, and employment info for KYC verification")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "KYC application submitted successfully"),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid KYC data"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<KycApplicationResponse> submitKycApplication(
            @Parameter(hidden = true) Principal principal,
            @Valid @RequestBody KycApplicationRequest request) {

        String identitySubject = principal.getName();
        KycApplicationResponse response = kycApplicationService.submitApplication(identitySubject, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Get Latest KYC Application", description = "Retrieve current status of the customer's active or latest KYC case")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Latest KYC application retrieved"),
            @ApiResponse(responseCode = "404", description = "No KYC applications found")
    })
    public ResponseEntity<KycApplicationResponse> getLatestKycApplication(@Parameter(hidden = true) Principal principal) {
        String identitySubject = principal.getName();
        KycApplicationResponse response = kycApplicationService.getLatestApplication(identitySubject);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    @Operation(summary = "Get KYC Application History", description = "Retrieve full history of past KYC submissions and decisions")
    public ResponseEntity<List<KycApplicationResponse>> getKycApplicationHistory(@Parameter(hidden = true) Principal principal) {
        String identitySubject = principal.getName();
        List<KycApplicationResponse> history = kycApplicationService.getApplicationHistory(identitySubject);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/{kycCaseId}")
    @Operation(summary = "Get Specific KYC Application", description = "Retrieve a specific KYC application case by its unique UUID")
    public ResponseEntity<KycApplicationResponse> getKycApplication(
            @Parameter(hidden = true) Principal principal,
            @Parameter(description = "KYC Case UUID") @PathVariable String kycCaseId) {

        String identitySubject = principal.getName();
        KycApplicationResponse response = kycApplicationService.getApplicationById(identitySubject, kycCaseId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{kycCaseId}/cancel")
    @Operation(summary = "Cancel KYC Application", description = "Cancel a pending KYC application case")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Application cancelled successfully"),
            @ApiResponse(responseCode = "400", description = "Application cannot be cancelled in its current state")
    })
    public ResponseEntity<Void> cancelKycApplication(
            @Parameter(hidden = true) Principal principal,
            @Parameter(description = "KYC Case UUID") @PathVariable String kycCaseId) {

        String identitySubject = principal.getName();
        kycApplicationService.cancelApplication(identitySubject, kycCaseId);
        return ResponseEntity.noContent().build();
    }
}
