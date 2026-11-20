package com.fintech.payment.controller;

import com.fintech.payment.dto.request.AddBeneficiaryRequest;
import com.fintech.payment.dto.response.BeneficiaryResponse;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/beneficiaries")
@Tag(name = "Beneficiaries", description = "Endpoints for managing payee/beneficiary accounts for funds transfers")
@SecurityRequirement(name = "BearerAuth")
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    public BeneficiaryController(BeneficiaryService beneficiaryService) {
        this.beneficiaryService = beneficiaryService;
    }

    @PostMapping
    @Operation(summary = "Add New Beneficiary", description = "Register a new external or internal beneficiary bank account for future transfers")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Beneficiary added and verified successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid beneficiary payload or routing code"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<BeneficiaryResponse> addBeneficiary(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AddBeneficiaryRequest request) {

        String userId = jwt.getSubject();
        BeneficiaryResponse response =
                beneficiaryService.addBeneficiary(userId, request);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}
