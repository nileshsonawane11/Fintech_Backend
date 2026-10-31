package com.fintech.identity.service;

import com.fintech.identity.dto.response.PermissionResponse;
import com.fintech.identity.dto.response.RoleResponse;
import com.fintech.identity.dto.response.UserPermissionResponse;
import com.fintech.identity.dto.response.UserPermissionsSummaryResponse;
import com.fintech.identity.dto.response.UserRoleResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.*;
import com.fintech.identity.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuthorizationService {

    private final CustomerRepository customerRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final AuthorizationAuditLogRepository auditLogRepository;

    public AuthorizationService(
            CustomerRepository customerRepository,
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository,
            UserPermissionRepository userPermissionRepository,
            AuthorizationAuditLogRepository auditLogRepository
    ) {
        this.customerRepository = customerRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<String> getAssignedRoleNames(UUID userId) {
        List<UserRole> userRoles = userRoleRepository.findByIdUserId(userId);
        if (userRoles.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> roleIds = userRoles.stream()
                .map(UserRole::getRoleId)
                .collect(Collectors.toSet());

        return roleRepository.findAllById(roleIds).stream()
                .map(RoleEntity::getName)
                .sorted()
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserRoleResponse> getAssignedRoles(UUID userId) {
        List<UserRole> userRoles = userRoleRepository.findByIdUserId(userId);
        if (userRoles.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, RoleEntity> roleMap = roleRepository.findAllById(
                userRoles.stream().map(UserRole::getRoleId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(RoleEntity::getId, r -> r));

        return userRoles.stream()
                .map(ur -> {
                    RoleEntity role = roleMap.get(ur.getRoleId());
                    return new UserRoleResponse(
                            ur.getUserId(),
                            ur.getRoleId(),
                            role != null ? role.getName() : "UNKNOWN",
                            ur.getAssignedBy(),
                            ur.getAssignedAt()
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public Set<String> getRolePermissions(UUID userId) {
        List<UserRole> userRoles = userRoleRepository.findByIdUserId(userId);
        if (userRoles.isEmpty()) {
            return Collections.emptySet();
        }

        Set<UUID> roleIds = userRoles.stream()
                .map(UserRole::getRoleId)
                .collect(Collectors.toSet());

        List<RolePermission> rolePermissions = rolePermissionRepository.findByIdRoleIdIn(roleIds);
        if (rolePermissions.isEmpty()) {
            return Collections.emptySet();
        }

        Set<UUID> permissionIds = rolePermissions.stream()
                .map(RolePermission::getPermissionId)
                .collect(Collectors.toSet());

        return permissionRepository.findAllById(permissionIds).stream()
                .map(PermissionEntity::getCode)
                .collect(Collectors.toCollection(TreeSet::new));
    }

    @Transactional(readOnly = true)
    public Set<String> getUserAllowPermissions(UUID userId) {
        return getUserPermissionsByEffect(userId, "ALLOW");
    }

    @Transactional(readOnly = true)
    public Set<String> getUserDenyPermissions(UUID userId) {
        return getUserPermissionsByEffect(userId, "DENY");
    }

    private Set<String> getUserPermissionsByEffect(UUID userId, String effect) {
        List<UserPermission> userPermissions = userPermissionRepository.findByIdUserId(userId);
        if (userPermissions.isEmpty()) {
            return Collections.emptySet();
        }

        Set<UUID> permissionIds = userPermissions.stream()
                .filter(up -> effect.equalsIgnoreCase(up.getEffect()))
                .map(UserPermission::getPermissionId)
                .collect(Collectors.toSet());

        if (permissionIds.isEmpty()) {
            return Collections.emptySet();
        }

        return permissionRepository.findAllById(permissionIds).stream()
                .map(PermissionEntity::getCode)
                .collect(Collectors.toCollection(TreeSet::new));
    }

    @Transactional(readOnly = true)
    public List<String> getEffectivePermissions(UUID userId) {
        Set<String> rolePermissions = getRolePermissions(userId);
        Set<String> allowPermissions = getUserAllowPermissions(userId);
        Set<String> denyPermissions = getUserDenyPermissions(userId);

        Set<String> effective = new TreeSet<>(rolePermissions);
        effective.addAll(allowPermissions);
        effective.removeAll(denyPermissions);

        return new ArrayList<>(effective);
    }

    @Transactional(readOnly = true)
    public boolean hasRole(UUID userId, String roleName) {
        return getAssignedRoleNames(userId).contains(roleName.toUpperCase());
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(UUID userId, String permissionCode) {
        return getEffectivePermissions(userId).contains(permissionCode);
    }

    @Transactional
    public void assignRole(UUID actorUserId, UUID targetUserId, String roleName) {
        Customer target = findCustomerOrThrow(targetUserId);
        RoleEntity role = findRoleByNameOrThrow(roleName);

        validateActorCanManageTargetRole(actorUserId, targetUserId, role.getName(), "assign");

        if (!userRoleRepository.existsByIdUserIdAndIdRoleId(targetUserId, role.getId())) {
            UserRole userRole = new UserRole(targetUserId, role.getId(), actorUserId);
            userRoleRepository.save(userRole);

            auditLogRepository.save(new AuthorizationAuditLog(
                    actorUserId,
                    targetUserId,
                    "ROLE_ASSIGNED",
                    null,
                    role.getName()
            ));
        }
    }

    @Transactional
    public void revokeRole(UUID actorUserId, UUID targetUserId, UUID roleId) {
        Customer target = findCustomerOrThrow(targetUserId);
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Role was not found."));

        validateActorCanManageTargetRole(actorUserId, targetUserId, role.getName(), "revoke");

        if (userRoleRepository.existsByIdUserIdAndIdRoleId(targetUserId, roleId)) {
            userRoleRepository.deleteByIdUserIdAndIdRoleId(targetUserId, roleId);

            auditLogRepository.save(new AuthorizationAuditLog(
                    actorUserId,
                    targetUserId,
                    "ROLE_REVOKED",
                    role.getName(),
                    null
            ));
        }
    }

    @Transactional
    public void assignUserPermission(UUID actorUserId, UUID targetUserId, String permissionCode, String effect) {
        if (!"ALLOW".equalsIgnoreCase(effect) && !"DENY".equalsIgnoreCase(effect)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EFFECT", "Permission effect must be ALLOW or DENY.");
        }

        Customer target = findCustomerOrThrow(targetUserId);
        PermissionEntity permission = permissionRepository.findByCode(permissionCode)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PERMISSION_NOT_FOUND", "Permission was not found."));

        validateActorCanManageTargetPermission(actorUserId, targetUserId, permission.getCode());

        String previousEffect = userPermissionRepository
                .findByIdUserIdAndIdPermissionId(targetUserId, permission.getId())
                .map(UserPermission::getEffect)
                .orElse(null);

        UserPermission userPermission = new UserPermission(
                targetUserId,
                permission.getId(),
                effect.toUpperCase(),
                actorUserId
        );
        userPermissionRepository.save(userPermission);

        auditLogRepository.save(new AuthorizationAuditLog(
                actorUserId,
                targetUserId,
                "PERMISSION_ASSIGNED",
                previousEffect != null ? permission.getCode() + ":" + previousEffect : null,
                permission.getCode() + ":" + effect.toUpperCase()
        ));
    }

    @Transactional
    public void revokeUserPermission(UUID actorUserId, UUID targetUserId, UUID permissionId) {
        Customer target = findCustomerOrThrow(targetUserId);
        PermissionEntity permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PERMISSION_NOT_FOUND", "Permission was not found."));

        validateActorCanManageTargetPermission(actorUserId, targetUserId, permission.getCode());

        Optional<UserPermission> existing = userPermissionRepository
                .findByIdUserIdAndIdPermissionId(targetUserId, permissionId);

        if (existing.isPresent()) {
            userPermissionRepository.deleteByIdUserIdAndIdPermissionId(targetUserId, permissionId);

            auditLogRepository.save(new AuthorizationAuditLog(
                    actorUserId,
                    targetUserId,
                    "PERMISSION_REVOKED",
                    permission.getCode() + ":" + existing.get().getEffect(),
                    null
            ));
        }
    }

    @Transactional(readOnly = true)
    public UserPermissionsSummaryResponse getUserPermissionsSummary(UUID userId) {
        findCustomerOrThrow(userId);

        List<String> assignedRoles = getAssignedRoleNames(userId);
        List<String> rolePermissions = new ArrayList<>(getRolePermissions(userId));

        List<UserPermission> directList = userPermissionRepository.findByIdUserId(userId);
        Map<UUID, PermissionEntity> permMap = permissionRepository.findAllById(
                directList.stream().map(UserPermission::getPermissionId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(PermissionEntity::getId, p -> p));

        List<UserPermissionResponse> directResponses = directList.stream()
                .map(up -> {
                    PermissionEntity p = permMap.get(up.getPermissionId());
                    return new UserPermissionResponse(
                            up.getUserId(),
                            up.getPermissionId(),
                            p != null ? p.getCode() : "UNKNOWN",
                            up.getEffect(),
                            up.getAssignedBy(),
                            up.getAssignedAt()
                    );
                })
                .toList();

        List<String> effectivePermissions = getEffectivePermissions(userId);

        return new UserPermissionsSummaryResponse(
                userId,
                assignedRoles,
                rolePermissions,
                directResponses,
                effectivePermissions
        );
    }

    public void validateActorCanManageTargetRole(UUID actorUserId, UUID targetUserId, String roleName, String action) {
        if (actorUserId == null) {
            return; // Internal system provisioning
        }

        if (actorUserId.equals(targetUserId)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "Users cannot modify their own privileges to escalate access."
            );
        }

        boolean actorIsAdmin = hasRole(actorUserId, "ADMIN");
        boolean actorIsManager = hasRole(actorUserId, "MANAGER");

        if (!actorIsAdmin && !actorIsManager) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "You are not authorized to manage roles."
            );
        }

        if (actorIsManager && !actorIsAdmin) {
            // MANAGER restrictions
            if ("ADMIN".equalsIgnoreCase(roleName) || "MANAGER".equalsIgnoreCase(roleName)) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "FORBIDDEN",
                        "Managers cannot " + action + " ADMIN or MANAGER roles."
                );
            }

            if (hasRole(targetUserId, "ADMIN")) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "FORBIDDEN",
                        "Managers cannot modify ADMIN accounts."
                );
            }
        }
    }

    public void validateActorCanManageTargetPermission(UUID actorUserId, UUID targetUserId, String permissionCode) {
        if (actorUserId == null) {
            return;
        }

        if (actorUserId.equals(targetUserId)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "Users cannot modify their own privileges to escalate access."
            );
        }

        boolean actorIsAdmin = hasRole(actorUserId, "ADMIN");
        boolean actorIsManager = hasRole(actorUserId, "MANAGER");

        if (!actorIsAdmin && !actorIsManager) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "You are not authorized to manage permissions."
            );
        }

        if (actorIsManager && !actorIsAdmin) {
            if (hasRole(targetUserId, "ADMIN")) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "FORBIDDEN",
                        "Managers cannot modify ADMIN accounts."
                );
            }

            // Manager cannot grant permissions beyond what they themselves are authorized to manage
            if (!hasPermission(actorUserId, permissionCode)) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "FORBIDDEN",
                        "Managers cannot grant permissions beyond their authorized privileges."
                );
            }
        }
    }

    private Customer findCustomerOrThrow(UUID customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "User was not found."
                ));
    }

    private RoleEntity findRoleByNameOrThrow(String roleName) {
        return roleRepository.findByName(roleName.toUpperCase())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "ROLE_NOT_FOUND",
                        "Role " + roleName + " was not found."
                ));
    }
}
