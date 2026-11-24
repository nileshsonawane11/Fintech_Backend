package com.fintech.customer.controller;

import com.fintech.customer.dto.request.ApproveKycRequest;
import com.fintech.customer.dto.response.KycApplicationDetailsResponse;
import com.fintech.customer.dto.response.KycApprovalResponse;
import com.fintech.customer.dto.response.OpsKycApplicationResponse;
import com.fintech.customer.exception.ApiException;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.KycCase;
import com.fintech.customer.model.kyc.state.KycStatus;
import com.fintech.customer.model.kyc.state.RiskCategory;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.repository.KycCaseRepository;
import com.fintech.customer.service.KycOperationsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/ops/api/v1/kyc")
@Tag(name = "Operations - KYC", description = "Operations staff endpoints for KYC case review, approval, and rejection")
@SecurityRequirement(name = "BearerAuth")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATIONS')")
public class OpsKycController {

    private final KycCaseRepository kycCaseRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final KycOperationsService kycOperationsService;

    public OpsKycController(KycCaseRepository kycCaseRepository,
                            CustomerProfileRepository customerProfileRepository,
                            KycOperationsService kycOperationsService) {
        this.kycCaseRepository = kycCaseRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.kycOperationsService = kycOperationsService;
    }

    @GetMapping("/applications")
    @Transactional(readOnly = true)
    @Operation(summary = "List KYC Cases", description = "List all customer KYC verification cases ordered by creation date")
    public ResponseEntity<List<OpsKycApplicationResponse>> listApplications() {
        List<KycCase> cases = kycCaseRepository.findAllByOrderByCreatedAtDesc();

        List<OpsKycApplicationResponse> list = cases.stream().map(c -> {
            CustomerProfile profile = c.getCustomerProfile();
            return new OpsKycApplicationResponse(
                    c.getKycCaseId(),
                    profile != null && profile.getCustomerId() != null ? profile.getCustomerId().toString() : "",
                    profile != null ? profile.getFullName() : "",
                    c.getStatus() != null ? c.getStatus().name() : "SUBMITTED",
                    c.getRiskCategory() != null ? c.getRiskCategory().name() : "UNASSESSED",
                    c.getOccupation(),
                    c.getAnnualIncomeRange(),
                    c.isAadhaarConsent(),
                    c.getSubmittedAt()
            );
        }).collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    @GetMapping("/applications/details")
    @Operation(summary = "Get KYC Application Details (Filterable)", description = "Filter KYC cases by status and search query for operations workflow")
    public ResponseEntity<List<KycApplicationDetailsResponse>> getKycApplicationDetails(
            @Parameter(description = "Filter by KYC Status (e.g. SUBMITTED, APPROVED, REJECTED, ALL)") @RequestParam(required = false, defaultValue = "ALL") String status,
            @Parameter(description = "Search query matching customer name, email, or case ID") @RequestParam(required = false, defaultValue = "") String query
    ) {

        List<KycApplicationDetailsResponse> applications =
                kycOperationsService.getKycApplicationDetails(status, query);

        return ResponseEntity.ok(applications);
    }

    @GetMapping("/applications/{kycCaseId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Get KYC Case Details", description = "Retrieve complete details for a single KYC verification case")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "KYC case retrieved"),
            @ApiResponse(responseCode = "404", description = "KYC case not found")
    })
    public ResponseEntity<OpsKycApplicationResponse> getApplication(
            @Parameter(description = "KYC Case ID") @PathVariable String kycCaseId) {
        KycCase c = kycCaseRepository.findByKycCaseId(kycCaseId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "KYC_NOT_FOUND", "KYC Case not found"));

        CustomerProfile profile = c.getCustomerProfile();
        OpsKycApplicationResponse response = new OpsKycApplicationResponse(
                c.getKycCaseId(),
                profile != null && profile.getCustomerId() != null ? profile.getCustomerId().toString() : "",
                profile != null ? profile.getFullName() : "",
                c.getStatus() != null ? c.getStatus().name() : "SUBMITTED",
                c.getRiskCategory() != null ? c.getRiskCategory().name() : "UNASSESSED",
                c.getOccupation(),
                c.getAnnualIncomeRange(),
                c.isAadhaarConsent(),
                c.getSubmittedAt()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{kycCaseId}/approve")
    @Transactional
    @Operation(summary = "Approve KYC Case", description = "Approve customer KYC case and assign verified risk rating")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "KYC case approved"),
            @ApiResponse(responseCode = "404", description = "KYC case not found")
    })
    public ResponseEntity<KycApprovalResponse> approveKyc(
            @Parameter(description = "KYC Case ID") @PathVariable String kycCaseId,
            @Valid @RequestBody ApproveKycRequest request,
            @Parameter(hidden = true) Principal principal) {

        KycCase kycCase = kycCaseRepository.findByKycCaseId(kycCaseId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "KYC_NOT_FOUND", "KYC Case not found"));

        kycCase.setStatus(KycStatus.APPROVED);
        RiskCategory risk = RiskCategory.LOW;
        if (request.riskCategory() != null && !request.riskCategory().isBlank()) {
            try {
                risk = RiskCategory.valueOf(request.riskCategory().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }
        kycCase.setRiskCategory(risk);
        kycCaseRepository.save(kycCase);

        CustomerProfile profile = kycCase.getCustomerProfile();
        if (profile != null) {
            profile.setKycStatus("APPROVED");
            profile.setRiskCategory(risk.name());
            customerProfileRepository.save(profile);
        }

        String approvedBy = principal != null && principal.getName() != null ? principal.getName() : "OPS-2001";
        String customerIdStr = profile != null && profile.getCustomerId() != null ? profile.getCustomerId().toString() : "CUS-100234";

        KycApprovalResponse response = new KycApprovalResponse(
                kycCase.getKycCaseId(),
                customerIdStr,
                "APPROVED",
                risk.name(),
                approvedBy,
                Instant.now()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{kycCaseId}/reject")
    @Transactional
    @Operation(summary = "Reject KYC Case", description = "Reject customer KYC case with compliance justification")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "KYC case rejected"),
            @ApiResponse(responseCode = "404", description = "KYC case not found")
    })
    public ResponseEntity<KycApprovalResponse> rejectKyc(
            @Parameter(description = "KYC Case ID") @PathVariable String kycCaseId,
            @Valid @RequestBody ApproveKycRequest request,
            @Parameter(hidden = true) Principal principal) {

        KycCase kycCase = kycCaseRepository.findByKycCaseId(kycCaseId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "KYC_NOT_FOUND", "KYC Case not found"));

        kycCase.setStatus(KycStatus.REJECTED);
        kycCaseRepository.save(kycCase);

        CustomerProfile profile = kycCase.getCustomerProfile();
        if (profile != null) {
            profile.setKycStatus("REJECTED");
            customerProfileRepository.save(profile);
        }

        String rejectedBy = principal != null && principal.getName() != null ? principal.getName() : "OPS-2001";
        String customerIdStr = profile != null && profile.getCustomerId() != null ? profile.getCustomerId().toString() : "";

        KycApprovalResponse response = new KycApprovalResponse(
                kycCase.getKycCaseId(),
                customerIdStr,
                "REJECTED",
                kycCase.getRiskCategory() != null ? kycCase.getRiskCategory().name() : "UNASSESSED",
                rejectedBy,
                Instant.now()
        );

        return ResponseEntity.ok(response);
    }
}
