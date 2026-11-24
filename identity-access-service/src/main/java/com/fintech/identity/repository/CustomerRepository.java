package com.fintech.identity.repository;

import com.fintech.identity.model.Customer;
import com.fintech.identity.model.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository
        extends JpaRepository<Customer, UUID> {

    boolean existsByMobileNumber(String mobileNumber);

    boolean existsByEmail(String email);

    Optional<Customer> findByMobileNumber(String mobileNumber);

    Optional<Customer> findByEmail(String email);

    Optional<Customer> findByMobileNumberOrEmail(
            String mobileNumber,
            String email
    );

    Optional<Customer> findByEmailAndRole(String email, Role role);

    Optional<Customer> findByMobileNumberAndRole(String mobileNumber, Role role);
}