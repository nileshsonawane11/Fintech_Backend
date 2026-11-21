package com.fintech.customer.service;

import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.repository.CustomerProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class CustomerProvisioningService {

    private final CustomerProfileRepository repository;

    public CustomerProvisioningService(
            CustomerProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void createProfileIfAbsent(Map<String, Object> payload) {

        if (repository.existsByIdentitySubject(payload.get("identityId").toString())) {
            return;
        }

        CustomerProfile profile = new CustomerProfile();

        profile.setId(UUID.randomUUID());
        profile.setCustomerId(
                UUID.randomUUID().toString().replace("-", "")
        );
        profile.setFullName(payload.get("fullname").toString());
        profile.setEmailMasked(payload.get("email").toString());
        profile.setMobileMasked(payload.get("mobile").toString());
        profile.setIdentitySubject(payload.get("identityId").toString());
        profile.setKycStatus("NOT_STARTED");
        profile.setRiskCategory("UNASSESSED");

        repository.save(profile);
    }
}