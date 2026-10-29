package com.fintech.customer.controller;

import com.fintech.customer.dto.request.ApproveKycRequest;
import com.fintech.customer.dto.response.KycApprovalResponse;
import com.fintech.customer.dto.response.OpsKycApplicationResponse;
import com.fintech.customer.exception.ApiException;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.KycCase;
import com.fintech.customer.model.kyc.state.KycStatus;
import com.fintech.customer.model.kyc.state.RiskCategory;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.repository.KycCaseRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/ops/api/v1/kyc")
@RequiredArgsConstructor
public class OpsKycController {

    private final KycCaseRepository kycCaseRepository;
    private final CustomerProfileRepository customerProfileRepository;

    @GetMapping("/applications")
    @Transactional(readOnly = true)
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

    @GetMapping("/applications/{kycCaseId}")
    @Transactional(readOnly = true)
    public ResponseEntity<OpsKycApplicationResponse> getApplication(@PathVariable String kycCaseId) {
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
    public ResponseEntity<KycApprovalResponse> approveKyc(
            @PathVariable String kycCaseId,
            @Valid @RequestBody ApproveKycRequest request,
            Principal principal) {

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
    public ResponseEntity<KycApprovalResponse> rejectKyc(
            @PathVariable String kycCaseId,
            @Valid @RequestBody ApproveKycRequest request,
            Principal principal) {

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
