package com.fintech.identity.repository;

import com.fintech.identity.model.UserRole;
import com.fintech.identity.model.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    List<UserRole> findByIdUserId(UUID userId);
    List<UserRole> findByIdRoleId(UUID roleId);
    boolean existsByIdUserIdAndIdRoleId(UUID userId, UUID roleId);
    void deleteByIdUserIdAndIdRoleId(UUID userId, UUID roleId);
    void deleteAllByIdUserId(UUID userId);
}
