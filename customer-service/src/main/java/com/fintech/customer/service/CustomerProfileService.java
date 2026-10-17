package com.fintech.customer.service;

import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.repository.CustomerProfileRepository;
import com.fintech.customer.dto.response.CustomerProfileResponse;
import com.fintech.customer.exception.ApiException;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerProfileService {

    private final CustomerProfileRepository customerProfileRepository;

    public CustomerProfileService(
            CustomerProfileRepository customerProfileRepository
    ) {
        this.customerProfileRepository = customerProfileRepository;
    }

    @Transactional(readOnly = true)
    public CustomerProfileResponse getCurrentCustomer(Jwt jwt) {

        if (jwt == null || jwt.getSubject() == null
                || jwt.getSubject().isBlank()) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_AUTHENTICATION",
                    "A valid authenticated identity is required."
            );
        }

        return getMyProfile(jwt.getSubject());
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

        return toResponse(profile);
    }

    private CustomerProfileResponse toResponse(CustomerProfile profile) {
        return new CustomerProfileResponse(
                profile.getCustomerId(),
                profile.getFullName(),
                profile.getDateOfBirth(),
                null, // Populate by decrypting mobileNumberEncrypted.
                null, // Populate by decrypting emailEncrypted.
                null, // Prefer a masked PAN, not the full PAN.
                profile.getKycStatus(),
                profile.getRiskCategory(),
                profile.getCreatedAt()
        );
    }
}