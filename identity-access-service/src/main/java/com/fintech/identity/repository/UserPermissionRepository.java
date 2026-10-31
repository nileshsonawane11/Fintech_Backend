package com.fintech.identity.repository;

import com.fintech.identity.model.UserPermission;
import com.fintech.identity.model.UserPermissionId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserPermissionRepository extends JpaRepository<UserPermission, UserPermissionId> {
    List<UserPermission> findByIdUserId(UUID userId);
    Optional<UserPermission> findByIdUserIdAndIdPermissionId(UUID userId, UUID permissionId);
    boolean existsByIdUserIdAndIdPermissionId(UUID userId, UUID permissionId);
    void deleteByIdUserIdAndIdPermissionId(UUID userId, UUID permissionId);
    void deleteAllByIdUserId(UUID userId);
}
