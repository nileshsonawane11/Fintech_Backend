package com.fintech.customer.controller;

import com.fintech.customer.dto.response.CustomerProfileResponse;
import com.fintech.customer.service.CustomerProfileService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
