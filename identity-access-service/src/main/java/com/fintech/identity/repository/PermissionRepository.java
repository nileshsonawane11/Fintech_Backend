package com.fintech.identity.repository;

import com.fintech.identity.model.PermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PermissionRepository extends JpaRepository<PermissionEntity, UUID> {
    Optional<PermissionEntity> findByCode(String code);
    boolean existsByCode(String code);
    List<PermissionEntity> findByCodeIn(Collection<String> codes);
}
