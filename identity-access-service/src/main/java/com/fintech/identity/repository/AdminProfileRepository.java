package com.fintech.identity.repository;

import com.fintech.identity.model.AdminProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdminProfileRepository extends JpaRepository<AdminProfile, UUID> {
    Optional<AdminProfile> findByAdminCode(String adminCode);
    boolean existsByAdminCode(String adminCode);
}
