package com.fintech.identity.controller;

import com.fintech.identity.dto.request.CreatePermissionRequest;
import com.fintech.identity.dto.request.UpdatePermissionRequest;
import com.fintech.identity.dto.response.PermissionResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.AuthorizationAuditLog;
import com.fintech.identity.model.PermissionEntity;
import com.fintech.identity.repository.AuthorizationAuditLogRepository;
import com.fintech.identity.repository.PermissionRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/permissions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPermissionController {

    private final PermissionRepository permissionRepository;
    private final AuthorizationAuditLogRepository auditLogRepository;

    public AdminPermissionController(
            PermissionRepository permissionRepository,
            AuthorizationAuditLogRepository auditLogRepository
    ) {
        this.permissionRepository = permissionRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(p -> new PermissionResponse(
                        p.getId(), p.getCode(), p.getDescription(), p.getModule(), p.getCreatedAt(), p.getUpdatedAt()
                ))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PERMISSION_CREATE')")
    @Transactional
    public PermissionResponse createPermission(
            @Valid @RequestBody CreatePermissionRequest request
    ) {
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (permissionRepository.existsByCode(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "PERMISSION_ALREADY_EXISTS", "Permission already exists.");
        }

        PermissionEntity permission = new PermissionEntity(
                code,
                request.description(),
                request.module().trim()
        );
        PermissionEntity saved = permissionRepository.save(permission);

        UUID actorId = extractActorId();
        auditLogRepository.save(new AuthorizationAuditLog(
                actorId,
                null,
                "PERMISSION_CREATED",
                null,
                saved.getCode()
        ));

        return new PermissionResponse(
                saved.getId(), saved.getCode(), saved.getDescription(), saved.getModule(), saved.getCreatedAt(), saved.getUpdatedAt()
        );
    }

    @PutMapping("/{permissionId}")
    @PreAuthorize("hasAuthority('PERMISSION_UPDATE')")
    @Transactional
    public PermissionResponse updatePermission(
            @PathVariable UUID permissionId,
            @Valid @RequestBody UpdatePermissionRequest request
    ) {
        PermissionEntity permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PERMISSION_NOT_FOUND", "Permission was not found."));

        String prevVal = permission.getDescription() + " | " + permission.getModule();

        if (request.description() != null) {
            permission.setDescription(request.description());
        }
        if (request.module() != null && !request.module().isBlank()) {
            permission.setModule(request.module().trim());
        }

        PermissionEntity updated = permissionRepository.save(permission);

        UUID actorId = extractActorId();
        auditLogRepository.save(new AuthorizationAuditLog(
                actorId,
                null,
                "PERMISSION_UPDATED",
                prevVal,
                updated.getDescription() + " | " + updated.getModule()
        ));

        return new PermissionResponse(
                updated.getId(), updated.getCode(), updated.getDescription(), updated.getModule(), updated.getCreatedAt(), updated.getUpdatedAt()
        );
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
