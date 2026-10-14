package com.Fintech.userservice.repository;

import com.Fintech.userservice.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CustomerRepository
        extends JpaRepository<Customer, UUID> {

    boolean existsByMobileNumber(String mobileNumber);

    boolean existsByEmail(String email);
}