package com.fintech.identity.controller;

import com.fintech.identity.dto.request.AssignUserPermissionRequest;
import com.fintech.identity.dto.response.UserPermissionsSummaryResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.PermissionEntity;
import com.fintech.identity.repository.PermissionRepository;
import com.fintech.identity.service.AuthorizationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users/{userId}/permissions")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class AdminUserPermissionController {

    private final AuthorizationService authorizationService;
    private final PermissionRepository permissionRepository;

    public AdminUserPermissionController(
            AuthorizationService authorizationService,
            PermissionRepository permissionRepository
    ) {
        this.authorizationService = authorizationService;
        this.permissionRepository = permissionRepository;
    }

    @GetMapping
    public UserPermissionsSummaryResponse getUserPermissions(@PathVariable UUID userId) {
        return authorizationService.getUserPermissionsSummary(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserPermissionsSummaryResponse assignPermission(
            @PathVariable UUID userId,
            @Valid @RequestBody AssignUserPermissionRequest request
    ) {
        UUID actorId = extractActorId();
        String permissionCode = request.permissionCode();

        if ((permissionCode == null || permissionCode.isBlank()) && request.permissionId() != null) {
            PermissionEntity permission = permissionRepository.findById(request.permissionId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PERMISSION_NOT_FOUND", "Permission was not found."));
            permissionCode = permission.getCode();
        }

        if (permissionCode == null || permissionCode.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PERMISSION_REQUIRED", "Permission code or ID is required.");
        }

        authorizationService.assignUserPermission(actorId, userId, permissionCode, request.effect());
        return authorizationService.getUserPermissionsSummary(userId);
    }

    @DeleteMapping("/{permissionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokePermission(
            @PathVariable UUID userId,
            @PathVariable UUID permissionId
    ) {
        UUID actorId = extractActorId();
        authorizationService.revokeUserPermission(actorId, userId, permissionId);
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
