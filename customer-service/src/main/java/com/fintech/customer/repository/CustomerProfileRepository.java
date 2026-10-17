
package com.fintech.customer.repository;

import com.fintech.customer.model.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerProfileRepository
        extends JpaRepository<CustomerProfile, UUID> {

    Optional<CustomerProfile> findByIdentitySubject(String identitySubject);

    boolean existsByIdentitySubject(String identitySubject);
}