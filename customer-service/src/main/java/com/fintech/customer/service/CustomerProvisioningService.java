package com.fintech.customer.service;

import com.fintech.customer.events.NotificationEvent;
import com.fintech.customer.model.CustomerProfile;
import com.fintech.customer.repository.CustomerProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class CustomerProvisioningService {

    private final CustomerProfileRepository repository;

    @Autowired(required = false)
    private ApplicationEventPublisher applicationEventPublisher;

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
        profile.setCustomerId("CUS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        profile.setFullName(payload.get("fullname").toString());
        profile.setEmailMasked(payload.get("email").toString());
        profile.setMobileMasked(payload.get("mobile").toString());
        profile.setIdentitySubject(payload.get("identityId").toString());
        profile.setKycStatus("NOT_STARTED");
        profile.setRiskCategory("UNASSESSED");

        CustomerProfile saved = repository.save(profile);
        if (applicationEventPublisher != null) {
            applicationEventPublisher.publishEvent(NotificationEvent.of(
                    "CUSTOMER_PROFILE_CREATED",
                    saved.getIdentitySubject(),
                    saved.getCustomerId(),
                    "CUSTOMER",
                    "Customer Profile Created",
                    "Your FinBank customer profile has been created. Complete KYC to unlock all banking features.",
                    "PROFILE",
                    "NORMAL",
                    Map.of("customerId", saved.getCustomerId(), "kycStatus", saved.getKycStatus())
            ));
        }
    }
}