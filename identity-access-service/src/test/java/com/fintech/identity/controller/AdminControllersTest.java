package com.fintech.identity.controller;

import com.fintech.identity.dto.request.*;
import com.fintech.identity.dto.response.*;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.PermissionEntity;
import com.fintech.identity.model.RoleEntity;
import com.fintech.identity.model.RolePermission;
import com.fintech.identity.repository.AuthorizationAuditLogRepository;
import com.fintech.identity.repository.PermissionRepository;
import com.fintech.identity.repository.RolePermissionRepository;
import com.fintech.identity.repository.RoleRepository;
import com.fintech.identity.service.AuthorizationService;
import com.fintech.identity.service.InternalUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdminControllersTest {

    private RoleRepository roleRepository;
    private PermissionRepository permissionRepository;
    private RolePermissionRepository rolePermissionRepository;
    private AuthorizationAuditLogRepository auditLogRepository;
    private AuthorizationService authorizationService;
    private InternalUserService internalUserService;

    private AdminRoleController roleController;
    private AdminPermissionController permissionController;
    private AdminUserRoleController userRoleController;
    private AdminUserPermissionController userPermissionController;
    private AdminInternalUserController internalUserController;

    private final UUID roleId = UUID.randomUUID();
    private final UUID permId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        roleRepository = mock(RoleRepository.class);
        permissionRepository = mock(PermissionRepository.class);
        rolePermissionRepository = mock(RolePermissionRepository.class);
        auditLogRepository = mock(AuthorizationAuditLogRepository.class);
        authorizationService = mock(AuthorizationService.class);
        internalUserService = mock(InternalUserService.class);

        roleController = new AdminRoleController(
                roleRepository, permissionRepository, rolePermissionRepository, auditLogRepository
        );
        permissionController = new AdminPermissionController(
                permissionRepository, auditLogRepository
        );
        userRoleController = new AdminUserRoleController(
                authorizationService, roleRepository
        );
        userPermissionController = new AdminUserPermissionController(
                authorizationService, permissionRepository
        );
        internalUserController = new AdminInternalUserController(
                internalUserService
        );
    }

    @Test
    @DisplayName("Admin can view all roles")
    void testAdminCanViewRoles() {
        when(roleRepository.findAll()).thenReturn(List.of(
                new RoleEntity("ADMIN", "Administrator"),
                new RoleEntity("CUSTOMER", "Customer")
        ));

        List<RoleResponse> roles = roleController.getAllRoles();
        assertEquals(2, roles.size());
    }

    @Test
    @DisplayName("Admin can create role")
    void testAdminCanCreateRole() {
        CreateRoleRequest request = new CreateRoleRequest("AUDITOR", "Internal auditor");

        when(roleRepository.existsByName("AUDITOR")).thenReturn(false);
        RoleEntity savedEntity = new RoleEntity("AUDITOR", "Internal auditor");
        when(roleRepository.save(any(RoleEntity.class))).thenReturn(savedEntity);

        RoleResponse response = roleController.createRole(request);
        assertNotNull(response);
        assertEquals("AUDITOR", response.name());
        verify(roleRepository).save(any(RoleEntity.class));
    }

    @Test
    @DisplayName("Admin creating duplicate role throws Conflict")
    void testCreateDuplicateRoleThrowsConflict() {
        CreateRoleRequest request = new CreateRoleRequest("ADMIN", "Admin role");
        when(roleRepository.existsByName("ADMIN")).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () -> roleController.createRole(request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("ROLE_ALREADY_EXISTS", ex.getCode());
    }

    @Test
    @DisplayName("Admin can get role by ID")
    void testGetRoleById() {
        RoleEntity role = new RoleEntity("MANAGER", "Bank manager");
        when(roleRepository.findById(roleId)).thenReturn(Optional.of(role));

        RoleResponse response = roleController.getRoleById(roleId);
        assertEquals("MANAGER", response.name());
    }

    @Test
    @DisplayName("Admin can update role description")
    void testUpdateRole() {
        RoleEntity role = new RoleEntity("MANAGER", "Old description");
        when(roleRepository.findById(roleId)).thenReturn(Optional.of(role));
        when(roleRepository.save(any(RoleEntity.class))).thenReturn(role);

        RoleResponse response = roleController.updateRole(roleId, new UpdateRoleRequest("New description"));
        assertNotNull(response);
        assertEquals("New description", role.getDescription());
    }

    @Test
    @DisplayName("Admin can get and update role permissions")
    void testGetAndUpdateRolePermissions() {
        RoleEntity role = new RoleEntity("OPERATIONS", "Operations");
        when(roleRepository.findById(roleId)).thenReturn(Optional.of(role));
        when(roleRepository.existsById(roleId)).thenReturn(true);

        PermissionEntity p1 = new PermissionEntity("ACCOUNT_VIEW", "View accounts", "Account");
        when(rolePermissionRepository.findByIdRoleId(roleId)).thenReturn(List.of(
                new RolePermission(roleId, permId, null)
        ));
        when(permissionRepository.findAllById(any())).thenReturn(List.of(p1));

        List<PermissionResponse> permissions = roleController.getRolePermissions(roleId);
        assertEquals(1, permissions.size());
        assertEquals("ACCOUNT_VIEW", permissions.get(0).code());

        // Update role permissions
        when(permissionRepository.existsById(permId)).thenReturn(true);
        AssignRolePermissionsRequest updateReq = new AssignRolePermissionsRequest(List.of(permId), null);
        List<PermissionResponse> updated = roleController.updateRolePermissions(roleId, updateReq);

        assertNotNull(updated);
        verify(rolePermissionRepository).deleteAllByIdRoleId(roleId);
    }

    @Test
    @DisplayName("Admin can view all permissions")
    void testGetAllPermissions() {
        when(permissionRepository.findAll()).thenReturn(List.of(
                new PermissionEntity("ACCOUNT_VIEW", "View accounts", "Account"),
                new PermissionEntity("ACCOUNT_FREEZE", "Freeze account", "Account")
        ));

        List<PermissionResponse> list = permissionController.getAllPermissions();
        assertEquals(2, list.size());
    }

    @Test
    @DisplayName("Admin can create permission")
    void testAdminCanCreatePermission() {
        CreatePermissionRequest request = new CreatePermissionRequest("AUDIT_LOG_VIEW", "View audit logs", "Audit");

        when(permissionRepository.existsByCode("AUDIT_LOG_VIEW")).thenReturn(false);
        PermissionEntity perm = new PermissionEntity("AUDIT_LOG_VIEW", "View audit logs", "Audit");
        when(permissionRepository.save(any(PermissionEntity.class))).thenReturn(perm);

        PermissionResponse response = permissionController.createPermission(request);
        assertEquals("AUDIT_LOG_VIEW", response.code());
    }

    @Test
    @DisplayName("Admin can update permission")
    void testAdminCanUpdatePermission() {
        PermissionEntity perm = new PermissionEntity("ACCOUNT_FREEZE", "Freeze", "Account");
        when(permissionRepository.findById(permId)).thenReturn(Optional.of(perm));
        when(permissionRepository.save(any(PermissionEntity.class))).thenReturn(perm);

        PermissionResponse response = permissionController.updatePermission(permId, new UpdatePermissionRequest("New Freeze", "New Module"));
        assertNotNull(response);
        assertEquals("New Freeze", perm.getDescription());
    }

    @Test
    @DisplayName("Admin can manage user roles")
    void testUserRoleManagement() {
        when(authorizationService.getAssignedRoles(userId)).thenReturn(List.of(
                new UserRoleResponse(userId, roleId, "OPERATIONS", null, Instant.now())
        ));

        List<UserRoleResponse> roles = userRoleController.getUserRoles(userId);
        assertEquals(1, roles.size());

        // Assign role
        AssignUserRoleRequest assignReq = new AssignUserRoleRequest("OPERATIONS", null);
        List<UserRoleResponse> assigned = userRoleController.assignRole(userId, assignReq);
        assertEquals(1, assigned.size());
        verify(authorizationService).assignRole(any(), eq(userId), eq("OPERATIONS"));

        // Revoke role
        userRoleController.revokeRole(userId, roleId);
        verify(authorizationService).revokeRole(any(), eq(userId), eq(roleId));
    }

    @Test
    @DisplayName("Admin can manage user permissions")
    void testUserPermissionManagement() {
        when(authorizationService.getUserPermissionsSummary(userId)).thenReturn(new UserPermissionsSummaryResponse(
                userId, List.of("CUSTOMER"), List.of("ACCOUNT_VIEW"), Collections.emptyList(), List.of("ACCOUNT_VIEW")
        ));

        UserPermissionsSummaryResponse summary = userPermissionController.getUserPermissions(userId);
        assertEquals(userId, summary.userId());

        // Assign permission
        AssignUserPermissionRequest req = new AssignUserPermissionRequest("ACCOUNT_FREEZE", null, "ALLOW");
        UserPermissionsSummaryResponse res = userPermissionController.assignPermission(userId, req);
        assertNotNull(res);
        verify(authorizationService).assignUserPermission(any(), eq(userId), eq("ACCOUNT_FREEZE"), eq("ALLOW"));

        // Revoke permission
        userPermissionController.revokePermission(userId, permId);
        verify(authorizationService).revokeUserPermission(any(), eq(userId), eq(permId));
    }

    @Test
    @DisplayName("Admin can create MANAGER user")
    void testAdminCanCreateManager() {
        CreateManagerUserRequest request = new CreateManagerUserRequest(
                "9876543210",
                "mgr@finbank.com",
                "Password123!",
                "MGR-001",
                "Finance"
        );

        when(internalUserService.createManagerUser(any(), any())).thenReturn(new ManagerUserResponse(
                UUID.randomUUID(),
                "******3210",
                "m***@finbank.com",
                "MGR-001",
                "Finance",
                "ACTIVE",
                List.of("MANAGER"),
                Instant.now()
        ));

        ManagerUserResponse response = internalUserController.createManagerUser(request);
        assertEquals("MGR-001", response.managerCode());
    }

    @Test
    @DisplayName("Creating operations user delegates to InternalUserService")
    void testCreateOperationsUser() {
        CreateOperationsUserRequest request = new CreateOperationsUserRequest(
                "9876543210",
                "ops@finbank.com",
                "Password123!",
                "EMP-001",
                "Ops",
                "Analyst",
                UUID.randomUUID()
        );

        when(internalUserService.createOperationsUser(any(), any())).thenReturn(new OperationsUserResponse(
                UUID.randomUUID(),
                "******3210",
                "o***@finbank.com",
                "EMP-001",
                "Ops",
                "Analyst",
                request.managerId(),
                "ACTIVE",
                List.of("OPERATIONS"),
                Instant.now()
        ));

        OperationsUserResponse response = internalUserController.createOperationsUser(request);
        assertEquals("EMP-001", response.employeeCode());
    }
}
