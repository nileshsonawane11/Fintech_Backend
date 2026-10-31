package com.fintech.identity.controller;

import com.fintech.identity.dto.request.AssignRolePermissionsRequest;
import com.fintech.identity.dto.request.CreateRoleRequest;
import com.fintech.identity.dto.request.UpdateRoleRequest;
import com.fintech.identity.dto.response.PermissionResponse;
import com.fintech.identity.dto.response.RoleResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.AuthorizationAuditLog;
import com.fintech.identity.model.PermissionEntity;
import com.fintech.identity.model.RoleEntity;
import com.fintech.identity.model.RolePermission;
import com.fintech.identity.repository.AuthorizationAuditLogRepository;
import com.fintech.identity.repository.PermissionRepository;
import com.fintech.identity.repository.RolePermissionRepository;
import com.fintech.identity.repository.RoleRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/roles")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRoleController {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final AuthorizationAuditLogRepository auditLogRepository;

    public AdminRoleController(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository,
            AuthorizationAuditLogRepository auditLogRepository
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(r -> new RoleResponse(r.getId(), r.getName(), r.getDescription(), r.getCreatedAt()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    @Transactional
    public RoleResponse createRole(
            @Valid @RequestBody CreateRoleRequest request
    ) {
        String name = request.name().trim().toUpperCase(Locale.ROOT);
        if (roleRepository.existsByName(name)) {
            throw new ApiException(HttpStatus.CONFLICT, "ROLE_ALREADY_EXISTS", "Role already exists.");
        }

        RoleEntity role = new RoleEntity(name, request.description());
        RoleEntity saved = roleRepository.save(role);

        UUID actorId = extractActorId();
        auditLogRepository.save(new AuthorizationAuditLog(
                actorId,
                null,
                "ROLE_CREATED",
                null,
                saved.getName()
        ));

        return new RoleResponse(saved.getId(), saved.getName(), saved.getDescription(), saved.getCreatedAt());
    }

    @GetMapping("/{roleId}")
    public RoleResponse getRoleById(@PathVariable("roleId") UUID roleId) {
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Role was not found."));

        return new RoleResponse(role.getId(), role.getName(), role.getDescription(), role.getCreatedAt());
    }

    @PutMapping("/{roleId}")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    @Transactional
    public RoleResponse updateRole(
            @PathVariable UUID roleId,
            @Valid @RequestBody UpdateRoleRequest request
    ) {
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Role was not found."));

        String prevDesc = role.getDescription();
        role.setDescription(request.description());
        RoleEntity updated = roleRepository.save(role);

        UUID actorId = extractActorId();
        auditLogRepository.save(new AuthorizationAuditLog(
                actorId,
                null,
                "ROLE_UPDATED",
                prevDesc,
                updated.getDescription()
        ));

        return new RoleResponse(updated.getId(), updated.getName(), updated.getDescription(), updated.getCreatedAt());
    }

    @GetMapping("/{roleId}/permissions")
    public List<PermissionResponse> getRolePermissions(@PathVariable UUID roleId) {
        if (!roleRepository.existsById(roleId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Role was not found.");
        }

        List<RolePermission> mappings = rolePermissionRepository.findByIdRoleId(roleId);
        if (mappings.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> permissionIds = mappings.stream()
                .map(RolePermission::getPermissionId)
                .collect(Collectors.toSet());

        return permissionRepository.findAllById(permissionIds).stream()
                .map(p -> new PermissionResponse(
                        p.getId(), p.getCode(), p.getDescription(), p.getModule(), p.getCreatedAt(), p.getUpdatedAt()
                ))
                .toList();
    }

    @PutMapping("/{roleId}/permissions")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    @Transactional
    public List<PermissionResponse> updateRolePermissions(
            @PathVariable UUID roleId,
            @RequestBody AssignRolePermissionsRequest request
    ) {
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Role was not found."));

        Set<UUID> targetPermissionIds = new HashSet<>();
        if (request.permissionIds() != null) {
            targetPermissionIds.addAll(request.permissionIds());
        }
        if (request.permissionCodes() != null && !request.permissionCodes().isEmpty()) {
            permissionRepository.findByCodeIn(request.permissionCodes())
                    .forEach(p -> targetPermissionIds.add(p.getId()));
        }

        List<RolePermission> currentMappings = rolePermissionRepository.findByIdRoleId(roleId);
        String previousCodes = currentMappings.stream()
                .map(m -> m.getPermissionId().toString())
                .collect(Collectors.joining(","));

        rolePermissionRepository.deleteAllByIdRoleId(roleId);

        UUID actorId = extractActorId();
        for (UUID permId : targetPermissionIds) {
            if (permissionRepository.existsById(permId)) {
                rolePermissionRepository.save(new RolePermission(roleId, permId, actorId));
            }
        }

        auditLogRepository.save(new AuthorizationAuditLog(
                actorId,
                null,
                "ROLE_PERMISSIONS_UPDATED",
                previousCodes,
                targetPermissionIds.stream().map(UUID::toString).collect(Collectors.joining(","))
        ));

        return getRolePermissions(roleId);
    }

    private UUID extractActorId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            try {
                return UUID.fromString(jwt.getSubject());
            } catch (Exception ignored) {
            }
        }
        return null;
    }
}
