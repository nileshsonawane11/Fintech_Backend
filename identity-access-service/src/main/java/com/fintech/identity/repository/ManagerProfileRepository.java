package com.fintech.identity.repository;

import com.fintech.identity.model.ManagerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ManagerProfileRepository extends JpaRepository<ManagerProfile, UUID> {
    Optional<ManagerProfile> findByManagerCode(String managerCode);
    boolean existsByManagerCode(String managerCode);
}
