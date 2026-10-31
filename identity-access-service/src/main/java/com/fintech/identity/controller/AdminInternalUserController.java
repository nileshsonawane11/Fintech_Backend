package com.fintech.identity.controller;

import com.fintech.identity.dto.request.CreateManagerUserRequest;
import com.fintech.identity.dto.request.CreateOperationsUserRequest;
import com.fintech.identity.dto.response.ManagerUserResponse;
import com.fintech.identity.dto.response.OperationsUserResponse;
import com.fintech.identity.service.InternalUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminInternalUserController {

    private final InternalUserService internalUserService;

    public AdminInternalUserController(InternalUserService internalUserService) {
        this.internalUserService = internalUserService;
    }

    @PostMapping("/operations")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public OperationsUserResponse createOperationsUser(
            @Valid @RequestBody CreateOperationsUserRequest request
    ) {
        UUID actorId = extractActorId();
        return internalUserService.createOperationsUser(actorId, request);
    }

    @PostMapping("/managers")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ManagerUserResponse createManagerUser(
            @Valid @RequestBody CreateManagerUserRequest request
    ) {
        UUID actorId = extractActorId();
        return internalUserService.createManagerUser(actorId, request);
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
