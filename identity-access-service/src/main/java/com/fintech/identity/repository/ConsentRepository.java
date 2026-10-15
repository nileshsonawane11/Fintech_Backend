package com.fintech.identity.repository;

import com.fintech.identity.model.Consent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConsentRepository
        extends JpaRepository<Consent, UUID> {

    List<Consent> findAllByCustomerIdOrderByGrantedAtDesc(
            UUID customerId
    );
}