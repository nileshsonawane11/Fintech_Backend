package com.fintech.identity.repository;

import com.fintech.identity.model.RolePermission;
import com.fintech.identity.model.RolePermissionId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {
    List<RolePermission> findByIdRoleId(UUID roleId);
    List<RolePermission> findByIdRoleIdIn(Collection<UUID> roleIds);
    boolean existsByIdRoleIdAndIdPermissionId(UUID roleId, UUID permissionId);
    void deleteByIdRoleIdAndIdPermissionId(UUID roleId, UUID permissionId);
    void deleteAllByIdRoleId(UUID roleId);
}
