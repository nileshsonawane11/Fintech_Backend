package com.fintech.customer.controller;

import com.fintech.customer.dto.request.ApplicantProfileRequest;
import com.fintech.customer.dto.response.CustomerProfileResponse;
import com.fintech.customer.service.CustomerProfileService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customers")
@Tag(name = "Customer Profiles", description = "Endpoints for viewing and retrieving customer profile information")
@SecurityRequirement(name = "BearerAuth")
public class CustomerProfileController {

    private final CustomerProfileService customerService;

    public CustomerProfileController(CustomerProfileService customerService) {
        this.customerService = customerService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get Customer Profile", description = "Retrieve detailed KYC and account profile information for the authenticated customer")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized or missing access token"),
            @ApiResponse(responseCode = "404", description = "Customer profile not found")
    })
    public ResponseEntity<CustomerProfileResponse> getMyProfile(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {

        CustomerProfileResponse response =
                customerService.getMyProfile(jwt.getSubject());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/applicant")
    @Operation(summary = "Provision Applicant Profile", description = "Create or update customer profile, address, and KYC records for an applicant")
    public ResponseEntity<CustomerProfileResponse> provisionApplicant(
            @Valid @RequestBody ApplicantProfileRequest request) {
        CustomerProfileResponse response = customerService.provisionOrUpdateApplicantProfile(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/by-identity/{identitySubject}")
    @Operation(summary = "Get Customer Profile by Identity Subject", description = "Internal lookup of customer profile by identity subject")
    public ResponseEntity<CustomerProfileResponse> getProfileByIdentity(
            @PathVariable String identitySubject) {
        CustomerProfileResponse response = customerService.getMyProfile(identitySubject);
        return ResponseEntity.ok(response);
    }
}
