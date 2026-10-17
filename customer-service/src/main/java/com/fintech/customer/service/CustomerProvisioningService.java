package com.fintech.customer.service;

import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.repository.CustomerProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CustomerProvisioningService {

    private final CustomerProfileRepository repository;

    public CustomerProvisioningService(
            CustomerProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void createProfileIfAbsent(String identitySubject) {

        if (repository.existsByIdentitySubject(identitySubject)) {
            return;
        }

        CustomerProfile profile = new CustomerProfile();

        profile.setId(UUID.randomUUID());
        profile.setCustomerId(
                UUID.randomUUID().toString().replace("-", "")
        );
        profile.setIdentitySubject(identitySubject);
        profile.setKycStatus("NOT_STARTED");
        profile.setRiskCategory("UNASSESSED");

        repository.save(profile);
    }
}