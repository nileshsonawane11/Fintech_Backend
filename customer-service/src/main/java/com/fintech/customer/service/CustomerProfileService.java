package com.fintech.customer.service;

import com.fintech.customer.dto.request.ApplicantProfileRequest;
import com.fintech.customer.dto.response.CustomerAddressResponse;
import com.fintech.customer.dto.response.CustomerProfileResponse;
import com.fintech.customer.exception.ApiException;
import com.fintech.customer.model.CustomerAddress;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.model.KycCase;
import com.fintech.customer.model.kyc.state.KycStatus;
import com.fintech.customer.repository.CustomerAddressRepository;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.repository.KycCaseRepository;
import com.fintech.customer.security.FieldEncryptionService;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CustomerProfileService {

    private final CustomerProfileRepository customerProfileRepository;
    private final CustomerAddressRepository customerAddressRepository;
    private final KycCaseRepository kycCaseRepository;
    private final FieldEncryptionService encryptionService;

    public CustomerProfileService(
            CustomerProfileRepository customerProfileRepository,
            CustomerAddressRepository customerAddressRepository,
            KycCaseRepository kycCaseRepository,
            FieldEncryptionService encryptionService
    ) {
        this.customerProfileRepository = customerProfileRepository;
        this.customerAddressRepository = customerAddressRepository;
        this.kycCaseRepository = kycCaseRepository;
        this.encryptionService = encryptionService;
    }

    @Transactional
    public CustomerProfileResponse getCurrentCustomer(Jwt jwt) {

        if (jwt == null || jwt.getSubject() == null
                || jwt.getSubject().isBlank()) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_AUTHENTICATION",
                    "A valid authenticated identity is required."
            );
        }

        String subject = jwt.getSubject();
        CustomerProfile profile = customerProfileRepository
                .findByIdentitySubject(subject)
                .orElseGet(() -> {
                    String customerId = "CUS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                    CustomerProfile created = CustomerProfile.create(customerId, subject);
                    return customerProfileRepository.save(created);
                });

        List<CustomerAddress> customerAddress = customerAddressRepository.findAllByCustomerProfile_Id(profile.getId());
        return toResponse(profile, customerAddress);
    }

    @Transactional(readOnly = true)
    public CustomerProfileResponse getMyProfile(String identitySubject) {
        if (identitySubject == null || identitySubject.isBlank()) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_AUTHENTICATION",
                    "A valid authenticated identity is required."
            );
        }

        CustomerProfile profile = customerProfileRepository
                .findByIdentitySubject(identitySubject)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "CUSTOMER_NOT_FOUND",
                        "Customer profile was not found."
                ));

        List<CustomerAddress> customerAddress = customerAddressRepository.findAllByCustomerProfile_Id(profile.getId());

        return toResponse(profile, customerAddress);
    }

    @Transactional
    public CustomerProfileResponse provisionOrUpdateApplicantProfile(ApplicantProfileRequest request) {
        if (request.identitySubject() == null || request.identitySubject().isBlank()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_IDENTITY_SUBJECT",
                    "Identity subject is required."
            );
        }

        Optional<CustomerProfile> existingProfileOpt =
                customerProfileRepository.findByIdentitySubject(request.identitySubject());

        CustomerProfile profile;
        if (existingProfileOpt.isPresent()) {
            profile = existingProfileOpt.get();
            // Preserve verified KYC if already APPROVED
            if (!"APPROVED".equalsIgnoreCase(profile.getKycStatus())) {
                if (profile.getFullName() == null || profile.getFullName().isBlank()) {
                    profile.setFullName(request.fullName().trim());
                }
                if (profile.getDateOfBirth() == null) {
                    profile.setDateOfBirth(request.dateOfBirth());
                }
                if (profile.getPanMasked() == null && request.pan() != null && !request.pan().isBlank()) {
                    profile.setPanMasked(request.pan().trim().toUpperCase());
                    profile.setPanEncrypted(encryptionService.encrypt(request.pan().trim().toUpperCase()));
                }
                if (profile.getMobileMasked() == null && request.mobileNumber() != null) {
                    profile.setMobileMasked(request.mobileNumber());
                }
                if (profile.getEmailMasked() == null && request.email() != null) {
                    profile.setEmailMasked(request.email());
                }
                if (profile.getGender() == null && request.gender() != null) {
                    profile.setGender(request.gender());
                }
                profile = customerProfileRepository.save(profile);
            }
        } else {
            profile = new CustomerProfile();
            profile.setId(UUID.randomUUID());
            profile.setCustomerId("CUS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            profile.setIdentitySubject(request.identitySubject());
            profile.setFullName(request.fullName().trim());
            profile.setDateOfBirth(request.dateOfBirth());
            profile.setGender(request.gender());
            profile.setMobileMasked(request.mobileNumber());
            profile.setEmailMasked(request.email());
            if (request.pan() != null && !request.pan().isBlank()) {
                profile.setPanMasked(request.pan().trim().toUpperCase());
                profile.setPanEncrypted(encryptionService.encrypt(request.pan().trim().toUpperCase()));
            }
            profile.setKycStatus("NOT_STARTED");
            profile.setRiskCategory("UNASSESSED");
            profile = customerProfileRepository.save(profile);
        }

        // Save submitted address if not already present
        List<CustomerAddressRepository.AddressDetails> existingAddresses =
                customerAddressRepository.findAddressDetailsByCustomerIds(List.of(profile.getId()));
        boolean addressExists = existingAddresses.stream()
                .anyMatch(a -> request.addressLine1().equalsIgnoreCase(a.getAddressLine1()) &&
                               request.city().equalsIgnoreCase(a.getCity()));
        if (!addressExists) {
            CustomerAddress address = CustomerAddress.create(
                    profile,
                    request.getEffectiveAddressType(),
                    request.addressLine1().trim(),
                    request.addressLine2() != null ? request.addressLine2().trim() : null,
                    request.city().trim(),
                    request.state().trim(),
                    request.postalCode().trim(),
                    request.getEffectiveCountry()
            );
            customerAddressRepository.save(address);
        }

        // Handle KYC Case
        Optional<KycCase> latestCaseOpt = kycCaseRepository
                .findFirstByCustomerProfile_IdentitySubjectOrderByCreatedAtDesc(profile.getIdentitySubject());

        if (latestCaseOpt.isEmpty() ||
                (!"APPROVED".equalsIgnoreCase(profile.getKycStatus()) &&
                 latestCaseOpt.get().getStatus() != KycStatus.SUBMITTED &&
                 latestCaseOpt.get().getStatus() != KycStatus.UNDER_REVIEW)) {

            String caseId = "KYC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            KycCase kycCase = KycCase.submitted(
                    caseId,
                    profile,
                    request.gender(),
                    request.getEffectiveOccupation(),
                    request.getEffectiveAnnualIncomeRange(),
                    null,
                    true
            );
            kycCaseRepository.save(kycCase);
            if (!"APPROVED".equalsIgnoreCase(profile.getKycStatus())) {
                profile.setKycStatus("SUBMITTED");
                profile = customerProfileRepository.save(profile);
            }
        }

        List<CustomerAddress> customerAddress = customerAddressRepository.findAllByCustomerProfile_Id(profile.getId());

        return toResponse(profile, customerAddress);
    }

    private String maskMobile(String mobile) {
        if (mobile == null || mobile.length() < 5) return "******";
        return "******" + mobile.substring(mobile.length() - 4);
    }

    private String maskEmail(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        String local = email.substring(0, at);
        String domain = email.substring(at + 1);
        return local.substring(0, 1) + "***@" + domain;
    }

    private CustomerAddressResponse toAddressResponse(CustomerAddress address) {
        return new CustomerAddressResponse(
                address.getId(),
                address.getAddressType(),
                address.getAddressLine1(),
                address.getAddressLine2(),
                address.getCity(),
                address.getState(),
                address.getPostalCode(),
                address.getCountry(),
                address.getStatus(),
                address.isDeliverable(),
                address.getCreatedAt()
        );
    }

    private CustomerProfileResponse toResponse(
            CustomerProfile profile,
            List<CustomerAddress> customerAddresses
    ) {
        List<CustomerAddressResponse> addressResponses =
                customerAddresses.stream()
                        .map(this::toAddressResponse)
                        .toList();

        return new CustomerProfileResponse(
                profile.getCustomerId(),
                profile.getFullName(),
                profile.getDateOfBirth(),
                profile.getMobileMasked(),
                profile.getEmailMasked(),
                profile.getPanMasked(),
                profile.getAadharNo(),
                profile.getKycStatus(),
                profile.getRiskCategory(),
                profile.getCreatedAt(),
                profile.getGender(),
                addressResponses
        );
    }

}