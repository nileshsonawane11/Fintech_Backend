package com.fintech.customer.service;

import com.fintech.customer.dto.request.KycApplicationRequest;
import com.fintech.customer.dto.response.KycApplicationResponse;
import com.fintech.customer.events.NotificationEvent;
import com.fintech.customer.exception.ApiException;
import com.fintech.customer.model.CustomerAddress;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.KycCase;
import com.fintech.customer.model.kyc.state.KycStatus;
import com.fintech.customer.repository.CustomerAddressRepository;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.repository.KycCaseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import com.fintech.customer.security.FieldEncryptionService;
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
public class KycApplicationService {

    private final CustomerProfileRepository customerProfileRepository;
    private final KycCaseRepository kycCaseRepository;
    private final FieldEncryptionService encryptionService;
    private final CustomerAddressRepository customerAddressRepository;

    @Autowired(required = false)
    private ApplicationEventPublisher applicationEventPublisher;

    public KycApplicationService(CustomerProfileRepository customerProfileRepository,
                                 KycCaseRepository kycCaseRepository,
                                 FieldEncryptionService encryptionService) {
        this(customerProfileRepository, kycCaseRepository, encryptionService, null);
    }

    @Autowired
    public KycApplicationService(CustomerProfileRepository customerProfileRepository,
                                 KycCaseRepository kycCaseRepository,
                                 FieldEncryptionService encryptionService,
                                 CustomerAddressRepository customerAddressRepository) {
        this.customerProfileRepository = customerProfileRepository;
        this.kycCaseRepository = kycCaseRepository;
        this.encryptionService = encryptionService;
        this.customerAddressRepository = customerAddressRepository;
    }

    @Transactional
    public KycApplicationResponse submitApplication(String identitySubject, KycApplicationRequest request) {
        CustomerProfile profile = getOrCreateCustomerProfile(identitySubject);

        if (!"APPROVED".equalsIgnoreCase(profile.getKycStatus())) {
            profile.setFullName(request.fullName().trim());
            profile.setDateOfBirth(request.dateOfBirth());
            profile.setGender(request.gender());
            String panUpper = request.pan().trim().toUpperCase();
            profile.setPanMasked(panUpper);
            profile.setPanEncrypted(encryptionService.encrypt(panUpper));
            profile.setKycStatus("SUBMITTED");
            profile = customerProfileRepository.save(profile);
        }

        if (customerAddressRepository != null && request.address() != null) {
            var existingAddresses = customerAddressRepository.findAddressDetailsByCustomerIds(List.of(profile.getId()));
            boolean addrExists = existingAddresses.stream().anyMatch(a ->
                    request.address().addressLine1().equalsIgnoreCase(a.getAddressLine1()) &&
                    request.address().city().equalsIgnoreCase(a.getCity()));
            if (!addrExists) {
                CustomerAddress address = CustomerAddress.create(
                        profile,
                        request.address().addressType(),
                        request.address().addressLine1().trim(),
                        request.address().addressLine2() != null ? request.address().addressLine2().trim() : null,
                        request.address().city().trim(),
                        request.address().state().trim(),
                        request.address().postalCode().trim(),
                        request.address().country()
                );
                customerAddressRepository.save(address);
            }
        }

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
            if (applicationEventPublisher != null && profile.getIdentitySubject() != null) {
                applicationEventPublisher.publishEvent(NotificationEvent.of(
                        "KYC_APPLICATION_SUBMITTED",
                        profile.getIdentitySubject(),
                        savedCase.getKycCaseId(),
                        "KYC",
                        "KYC Application Submitted",
                        "Your KYC verification application (" + savedCase.getKycCaseId() + ") has been submitted and is under review.",
                        "KYC",
                        "NORMAL",
                        java.util.Map.of("kycCaseId", savedCase.getKycCaseId(), "status", savedCase.getStatus().name())
                ));
            }
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
    public KycApplicationResponse getApplicationById(String identitySubject, String kycCaseId) {
        KycCase kycCase = getKycCaseAndVerifyOwnership(identitySubject, kycCaseId);
        return toResponse(kycCase);
    }

    @Transactional
    public void cancelApplication(String identitySubject, String kycCaseId) {
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

        if (applicationEventPublisher != null && identitySubject != null) {
            applicationEventPublisher.publishEvent(NotificationEvent.of(
                    "KYC_APPLICATION_CANCELLED",
                    identitySubject,
                    kycCase.getKycCaseId(),
                    "KYC",
                    "KYC Application Cancelled",
                    "Your KYC verification application (" + kycCase.getKycCaseId() + ") has been cancelled.",
                    "KYC",
                    "NORMAL",
                    java.util.Map.of("kycCaseId", kycCase.getKycCaseId(), "status", KycStatus.CANCELLED.name())
            ));
        }
    }

    // --- Helper Methods ---

    private CustomerProfile getOrCreateCustomerProfile(String identitySubject) {
        return customerProfileRepository.findByIdentitySubject(identitySubject)
                .orElseGet(() -> {
                    String customerId = "CUS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    return customerProfileRepository.save(CustomerProfile.create(customerId, identitySubject));
                });
    }

    private KycCase getKycCaseAndVerifyOwnership(String identitySubject, String kycCaseId) {
        // Since KycCase now has a String 'kycCaseId' column, you can look it up directly as a String
        return kycCaseRepository.findByKycCaseIdAndCustomerProfile_IdentitySubject(kycCaseId, identitySubject)
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
