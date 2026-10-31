package com.fintech.identity.repository;

import com.fintech.identity.model.OperationsProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OperationsProfileRepository extends JpaRepository<OperationsProfile, UUID> {
    Optional<OperationsProfile> findByEmployeeCode(String employeeCode);
    boolean existsByEmployeeCode(String employeeCode);
}
