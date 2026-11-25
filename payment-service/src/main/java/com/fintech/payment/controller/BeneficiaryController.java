package com.fintech.payment.controller;

import com.fintech.payment.dto.request.AddBeneficiaryRequest;
import com.fintech.payment.dto.request.AddUpiBeneficiaryRequest;
import com.fintech.payment.dto.response.BeneficiaryResponse;
import com.fintech.payment.dto.response.BeneficiaryValidationResponse;
import com.fintech.payment.dto.response.OpsDtos.PagedResponse;
import com.fintech.payment.security.SecurityUtils;
import com.fintech.payment.service.BeneficiaryService;
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
@RequestMapping("/api/v1/beneficiaries")
@Tag(name = "Beneficiaries", description = "Endpoints for managing and validating bank and UPI beneficiaries")
@SecurityRequirement(name = "BearerAuth")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    public BeneficiaryController(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    @PostMapping
    @Operation(summary = "Add Bank Beneficiary", description = "Register a new bank account beneficiary for future transfers")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Bank beneficiary added and pending validation"),
            @ApiResponse(responseCode = "400", description = "Invalid beneficiary payload or IFSC"),
            @ApiResponse(responseCode = "403", description = "KYC not approved"),
            @ApiResponse(responseCode = "409", description = "Duplicate beneficiary")
    })
    public ResponseEntity<BeneficiaryResponse> addBeneficiary(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AddBeneficiaryRequest request) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(beneficiaryService.addBeneficiary(userId, request));
    }

    @PostMapping("/upi")
    @Operation(summary = "Add UPI Beneficiary", description = "Register a new UPI VPA beneficiary for future UPI payouts")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "UPI beneficiary added and pending validation"),
            @ApiResponse(responseCode = "400", description = "Invalid VPA format"),
            @ApiResponse(responseCode = "403", description = "KYC not approved"),
            @ApiResponse(responseCode = "409", description = "Duplicate UPI beneficiary")
    })
    public ResponseEntity<BeneficiaryResponse> addUpiBeneficiary(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AddUpiBeneficiaryRequest request) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(beneficiaryService.addUpiBeneficiary(userId, request));
    }

    @GetMapping
    @Operation(summary = "List Beneficiaries", description = "Retrieve paginated beneficiaries owned by the authenticated customer")
    public ResponseEntity<PagedResponse<BeneficiaryResponse>> listBeneficiaries(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(beneficiaryService.listBeneficiaries(userId, page, size));
    }

    @GetMapping("/{beneficiaryId}")
    @Operation(summary = "Get Beneficiary Details", description = "Fetch masked beneficiary details and validation status")
    public ResponseEntity<BeneficiaryResponse> getBeneficiary(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String beneficiaryId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(beneficiaryService.getBeneficiary(userId, beneficiaryId));
    }

    @PostMapping("/{beneficiaryId}/validate")
    @Operation(summary = "Validate Beneficiary", description = "Initiate RazorpayX bank or UPI fund account validation and name verification")
    public ResponseEntity<BeneficiaryValidationResponse> validateBeneficiary(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String beneficiaryId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(beneficiaryService.validateBeneficiary(userId, beneficiaryId));
    }

    @GetMapping("/{beneficiaryId}/validation-status")
    @Operation(summary = "Get Beneficiary Validation Status", description = "Retrieve or refresh the latest validation status from RazorpayX")
    public ResponseEntity<BeneficiaryValidationResponse> getValidationStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String beneficiaryId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(beneficiaryService.getValidationStatus(userId, beneficiaryId));
    }

    @DeleteMapping("/{beneficiaryId}")
    @Operation(summary = "Deactivate Beneficiary", description = "Deactivate a customer beneficiary so it can no longer receive payouts")
    public ResponseEntity<BeneficiaryResponse> deactivateBeneficiary(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @PathVariable String beneficiaryId) {
        String userId = SecurityUtils.getAuthenticatedSubject(jwt);
        return ResponseEntity.ok(beneficiaryService.deactivateBeneficiary(userId, beneficiaryId));
    }
}
