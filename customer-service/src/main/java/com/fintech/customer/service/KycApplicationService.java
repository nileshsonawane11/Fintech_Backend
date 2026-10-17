package com.fintech.customer.service;

import com.fintech.customer.dto.request.KycApplicationRequest;
import com.fintech.customer.dto.response.KycApplicationResponse;
import com.fintech.customer.exception.ApiException;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.KycCase;
import com.fintech.customer.model.kyc.state.KycStatus;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.repository.KycCaseRepository;
import com.fintech.customer.security.FieldEncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KycApplicationService {

    private final CustomerProfileRepository customerProfileRepository;
    private final KycCaseRepository kycCaseRepository;
    private final FieldEncryptionService encryptionService;

    @Transactional
    public KycApplicationResponse submitApplication(String identitySubject, KycApplicationRequest request) {
        CustomerProfile profile = getCustomerProfileOrThrow(identitySubject);

        // Check if an active application already exists
        kycCaseRepository.findFirstByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(identitySubject)
                .ifPresent(latestCase -> {
                    if (latestCase.getStatus() == KycStatus.UNDER_REVIEW || latestCase.getStatus() == KycStatus.SUBMITTED) {
                        throw new ApiException(
                                HttpStatus.CONFLICT,
                                "ACTIVE_KYC_EXISTS",
                                "An active KYC application is already in progress."
                        );
                    }
                });

        // Encrypt CKYC data if present
        String encryptedCkyc = null;
        if (request.ckycNumber() != null && !request.ckycNumber().isBlank()) {
            encryptedCkyc = encryptionService.encrypt(request.ckycNumber());
        }

        // Generate a public-facing Case ID (e.g., KYC- followed by random UUID characters)
        String caseId = "KYC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Use the domain factory method
        KycCase kycCase = KycCase.submitted(
                caseId,
                profile,
                request.gender(),
                request.occupation(),
                request.annualIncomeRange(),
                encryptedCkyc,
                request.aadhaarConsent()
        );

        try {
            KycCase savedCase = kycCaseRepository.save(kycCase);
            return toResponse(savedCase);
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "CONCURRENT_KYC_SUBMISSION",
                    "A concurrent KYC submission was detected. Please try again."
            );
        }
    }

    @Transactional(readOnly = true)
    public KycApplicationResponse getLatestApplication(String identitySubject) {
        KycCase latestCase = kycCaseRepository
                .findFirstByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(identitySubject)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "KYC_NOT_FOUND",
                        "No KYC application found for this customer."
                ));

        return toResponse(latestCase);
    }

    @Transactional(readOnly = true)
    public List<KycApplicationResponse> getApplicationHistory(String identitySubject) {
        List<KycCase> cases = kycCaseRepository
                .findAllByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(identitySubject);

        return cases.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public KycApplicationResponse getApplicationById(String identitySubject, UUID kycCaseId) {
        KycCase kycCase = getKycCaseAndVerifyOwnership(identitySubject, kycCaseId);
        return toResponse(kycCase);
    }

    @Transactional
    public void cancelApplication(String identitySubject, UUID kycCaseId) {
        KycCase kycCase = getKycCaseAndVerifyOwnership(identitySubject, kycCaseId);

        if (kycCase.getStatus() != KycStatus.UNDER_REVIEW && kycCase.getStatus() != KycStatus.SUBMITTED) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_STATE_TRANSITION",
                    "Only PENDING or SUBMITTED applications can be cancelled."
            );
        }

        kycCase.setStatus(KycStatus.CANCELLED);
        // Note: updatedAt is handled automatically by the @PreUpdate lifecycle hook in your entity
        kycCaseRepository.save(kycCase);
    }

    // --- Helper Methods ---

    private CustomerProfile getCustomerProfileOrThrow(String identitySubject) {
        return customerProfileRepository.findByIdentitySubject(identitySubject)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "CUSTOMER_NOT_FOUND",
                        "Customer profile was not found."
                ));
    }

    private KycCase getKycCaseAndVerifyOwnership(String identitySubject, UUID kycCaseId) {
        // Since KycCase now has a String 'kycCaseId' column, you can look it up directly as a String
        return kycCaseRepository.findByIdAndCustomerProfile_IdentitySubject(kycCaseId, identitySubject)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "KYC_NOT_FOUND",
                        "KYC application not found or you do not have permission to access it."
                ));
    }

    private KycApplicationResponse toResponse(KycCase kycCase) {
        // Calculate the estimated completion time (e.g., 72 hours from submission)
        Instant estimatedTime = kycCase.getSubmittedAt() != null
                ? kycCase.getSubmittedAt().plus(72, ChronoUnit.HOURS)
                : Instant.now().plus(72, ChronoUnit.HOURS);

        // Convert the associated customer ID to String for the response
        String customerIdStr = kycCase.getCustomerProfile().getCustomerId() != null
                ? kycCase.getCustomerProfile().getCustomerId().toString()
                : null;

        return new KycApplicationResponse(
                kycCase.getKycCaseId(),
                customerIdStr,
                kycCase.getStatus().name(),
                estimatedTime
        );
    }
}