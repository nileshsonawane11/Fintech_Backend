package com.fintech.identity.controller;

import com.fintech.identity.dto.request.CreateManagerUserRequest;
import com.fintech.identity.dto.request.CreateOperationsUserRequest;
import com.fintech.identity.dto.response.ManagerUserResponse;
import com.fintech.identity.dto.response.OperationsUserResponse;
import com.fintech.identity.service.InternalUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Admin - Internal Users", description = "Endpoints for creating and managing internal operations and manager staff accounts")
@SecurityRequirement(name = "BearerAuth")
public class AdminInternalUserController {

    private final InternalUserService internalUserService;

    public AdminInternalUserController(InternalUserService internalUserService) {
        this.internalUserService = internalUserService;
    }

    @PostMapping("/operations")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create Operations User (Admin, Manager Only)", description = "Create an operations staff user account (Requires ADMIN or MANAGER role)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Operations user created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid payload or validation failure"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public OperationsUserResponse createOperationsUser(
            @Valid @RequestBody CreateOperationsUserRequest request
    ) {
        UUID actorId = extractActorId();
        return internalUserService.createOperationsUser(actorId, request);
    }

    @PostMapping("/managers")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create Manager User (Admin Only)", description = "Create a manager user account (Requires ADMIN role)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Manager user created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid payload or validation failure"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
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
