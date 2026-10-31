package com.fintech.identity.controller;

import com.fintech.identity.dto.request.AssignUserRoleRequest;
import com.fintech.identity.dto.response.UserRoleResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.RoleEntity;
import com.fintech.identity.repository.RoleRepository;
import com.fintech.identity.service.AuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users/{userId}/roles")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class AdminUserRoleController {

    private final AuthorizationService authorizationService;
    private final RoleRepository roleRepository;

    public AdminUserRoleController(
            AuthorizationService authorizationService,
            RoleRepository roleRepository
    ) {
        this.authorizationService = authorizationService;
        this.roleRepository = roleRepository;
    }

    @GetMapping
    public List<UserRoleResponse> getUserRoles(@PathVariable UUID userId) {
        return authorizationService.getAssignedRoles(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<UserRoleResponse> assignRole(
            @PathVariable UUID userId,
            @RequestBody AssignUserRoleRequest request
    ) {
        UUID actorId = extractActorId();
        String roleName = request.roleName();

        if ((roleName == null || roleName.isBlank()) && request.roleId() != null) {
            RoleEntity role = roleRepository.findById(request.roleId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Role was not found."));
            roleName = role.getName();
        }

        if (roleName == null || roleName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ROLE_REQUIRED", "Role name or role ID is required.");
        }

        authorizationService.assignRole(actorId, userId, roleName);
        return authorizationService.getAssignedRoles(userId);
    }

    @DeleteMapping("/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeRole(
            @PathVariable UUID userId,
            @PathVariable UUID roleId
    ) {
        UUID actorId = extractActorId();
        authorizationService.revokeRole(actorId, userId, roleId);
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
