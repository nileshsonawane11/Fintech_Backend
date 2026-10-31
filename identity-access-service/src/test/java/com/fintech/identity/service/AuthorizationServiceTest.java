package com.fintech.identity.service;

import com.fintech.identity.dto.response.UserPermissionsSummaryResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.*;
import com.fintech.identity.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthorizationServiceTest {

    private CustomerRepository customerRepository;
    private RoleRepository roleRepository;
    private PermissionRepository permissionRepository;
    private UserRoleRepository userRoleRepository;
    private RolePermissionRepository rolePermissionRepository;
    private UserPermissionRepository userPermissionRepository;
    private AuthorizationAuditLogRepository auditLogRepository;

    private AuthorizationService authorizationService;

    private final UUID userId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID adminId = UUID.randomUUID();

    private final UUID customerRoleId = UUID.randomUUID();
    private final UUID operationsRoleId = UUID.randomUUID();
    private final UUID managerRoleId = UUID.randomUUID();
    private final UUID adminRoleId = UUID.randomUUID();

    private final RoleEntity customerRole = new RoleEntity("CUSTOMER", "Bank customer");
    private final RoleEntity operationsRole = new RoleEntity("OPERATIONS", "Operations staff");
    private final RoleEntity managerRole = new RoleEntity("MANAGER", "Bank manager");
    private final RoleEntity adminRole = new RoleEntity("ADMIN", "System administrator");

    private final PermissionEntity pAccountView = new PermissionEntity("ACCOUNT_VIEW", "View accounts", "Account");
    private final PermissionEntity pCustomerView = new PermissionEntity("CUSTOMER_VIEW", "View customers", "Customer");
    private final PermissionEntity pKycReview = new PermissionEntity("KYC_REVIEW", "Review KYC", "KYC");
    private final PermissionEntity pKycApprove = new PermissionEntity("KYC_APPROVE", "Approve KYC", "KYC");
    private final PermissionEntity pAccountFreeze = new PermissionEntity("ACCOUNT_FREEZE", "Freeze account", "Account");

    @BeforeEach
    void setUp() {
        customerRepository = mock(CustomerRepository.class);
        roleRepository = mock(RoleRepository.class);
        permissionRepository = mock(PermissionRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        rolePermissionRepository = mock(RolePermissionRepository.class);
        userPermissionRepository = mock(UserPermissionRepository.class);
        auditLogRepository = mock(AuthorizationAuditLogRepository.class);

        authorizationService = new AuthorizationService(
                customerRepository,
                roleRepository,
                permissionRepository,
                userRoleRepository,
                rolePermissionRepository,
                userPermissionRepository,
                auditLogRepository
        );

        when(roleRepository.findById(customerRoleId)).thenReturn(Optional.of(customerRole));
        when(roleRepository.findById(operationsRoleId)).thenReturn(Optional.of(operationsRole));
        when(roleRepository.findById(managerRoleId)).thenReturn(Optional.of(managerRole));
        when(roleRepository.findById(adminRoleId)).thenReturn(Optional.of(adminRole));

        when(roleRepository.findByName("CUSTOMER")).thenReturn(Optional.of(customerRole));
        when(roleRepository.findByName("OPERATIONS")).thenReturn(Optional.of(operationsRole));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(managerRole));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));

        when(roleRepository.findAllById(any())).thenAnswer(invocation -> {
            Set<UUID> ids = invocation.getArgument(0);
            List<RoleEntity> list = new ArrayList<>();
            if (ids.contains(customerRoleId)) list.add(customerRole);
            if (ids.contains(operationsRoleId)) list.add(operationsRole);
            if (ids.contains(managerRoleId)) list.add(managerRole);
            if (ids.contains(adminRoleId)) list.add(adminRole);
            return list;
        });

        when(permissionRepository.findAllById(any())).thenAnswer(invocation -> {
            Iterable<UUID> ids = invocation.getArgument(0);
            if (ids == null) return Collections.emptyList();
            List<PermissionEntity> list = new ArrayList<>();
            for (UUID id : ids) {
                if (pAccountView.getId() != null && pAccountView.getId().equals(id)) list.add(pAccountView);
                else if (pCustomerView.getId() != null && pCustomerView.getId().equals(id)) list.add(pCustomerView);
                else if (pKycReview.getId() != null && pKycReview.getId().equals(id)) list.add(pKycReview);
                else if (pKycApprove.getId() != null && pKycApprove.getId().equals(id)) list.add(pKycApprove);
                else if (pAccountFreeze.getId() != null && pAccountFreeze.getId().equals(id)) list.add(pAccountFreeze);
                else list.add(new PermissionEntity("P_" + id, "Desc", "Module"));
            }
            return list;
        });

        when(permissionRepository.findByCode("KYC_APPROVE")).thenReturn(Optional.of(pKycApprove));
        when(permissionRepository.findByCode("ACCOUNT_FREEZE")).thenReturn(Optional.of(pAccountFreeze));
    }

    @Test
    @DisplayName("Multiple roles assigned to one user")
    void testMultipleRolesAssignedToOneUser() {
        when(userRoleRepository.findByIdUserId(userId)).thenReturn(List.of(
                new UserRole(userId, customerRoleId, adminId),
                new UserRole(userId, operationsRoleId, adminId)
        ));

        List<String> roleNames = authorizationService.getAssignedRoleNames(userId);

        assertEquals(2, roleNames.size());
        assertTrue(roleNames.contains("CUSTOMER"));
        assertTrue(roleNames.contains("OPERATIONS"));
        assertTrue(authorizationService.hasRole(userId, "CUSTOMER"));
        assertTrue(authorizationService.hasRole(userId, "OPERATIONS"));
        assertFalse(authorizationService.hasRole(userId, "ADMIN"));
    }

    @Test
    @DisplayName("Permission inheritance from multiple roles")
    void testPermissionInheritanceFromMultipleRoles() {
        when(userRoleRepository.findByIdUserId(userId)).thenReturn(List.of(
                new UserRole(userId, customerRoleId, adminId),
                new UserRole(userId, operationsRoleId, adminId)
        ));

        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        UUID p3 = UUID.randomUUID();

        when(rolePermissionRepository.findByIdRoleIdIn(any())).thenReturn(List.of(
                new RolePermission(customerRoleId, p1, adminId),
                new RolePermission(operationsRoleId, p2, adminId),
                new RolePermission(operationsRoleId, p3, adminId)
        ));

        when(permissionRepository.findAllById(any())).thenReturn(List.of(
                new PermissionEntity("ACCOUNT_VIEW", "View accounts", "Account"),
                new PermissionEntity("CUSTOMER_VIEW", "View customers", "Customer"),
                new PermissionEntity("KYC_REVIEW", "Review KYC", "KYC")
        ));

        when(userPermissionRepository.findByIdUserId(userId)).thenReturn(Collections.emptyList());

        List<String> effective = authorizationService.getEffectivePermissions(userId);

        assertEquals(3, effective.size());
        assertTrue(effective.contains("ACCOUNT_VIEW"));
        assertTrue(effective.contains("CUSTOMER_VIEW"));
        assertTrue(effective.contains("KYC_REVIEW"));
        assertTrue(authorizationService.hasPermission(userId, "ACCOUNT_VIEW"));
        assertTrue(authorizationService.hasPermission(userId, "CUSTOMER_VIEW"));
        assertTrue(authorizationService.hasPermission(userId, "KYC_REVIEW"));
        assertFalse(authorizationService.hasPermission(userId, "KYC_APPROVE"));
    }

    @Test
    @DisplayName("User-level ALLOW permissions add to effective permissions")
    void testUserLevelAllowPermissions() {
        when(userRoleRepository.findByIdUserId(userId)).thenReturn(List.of(
                new UserRole(userId, customerRoleId, adminId)
        ));

        UUID p1 = UUID.randomUUID();
        UUID pAllow = UUID.randomUUID();

        when(rolePermissionRepository.findByIdRoleIdIn(any())).thenReturn(List.of(
                new RolePermission(customerRoleId, p1, adminId)
        ));

        when(userPermissionRepository.findByIdUserId(userId)).thenReturn(List.of(
                new UserPermission(userId, pAllow, "ALLOW", adminId)
        ));

        when(permissionRepository.findAllById(Set.of(p1))).thenReturn(List.of(
                new PermissionEntity("ACCOUNT_VIEW", "View accounts", "Account")
        ));
        when(permissionRepository.findAllById(Set.of(pAllow))).thenReturn(List.of(
                new PermissionEntity("KYC_APPROVE", "Approve KYC", "KYC")
        ));

        List<String> effective = authorizationService.getEffectivePermissions(userId);

        assertEquals(2, effective.size());
        assertTrue(effective.contains("ACCOUNT_VIEW"));
        assertTrue(effective.contains("KYC_APPROVE"));
    }

    @Test
    @DisplayName("User-level DENY overriding role permissions")
    void testUserLevelDenyOverridingRolePermissions() {
        when(userRoleRepository.findByIdUserId(userId)).thenReturn(List.of(
                new UserRole(userId, operationsRoleId, adminId)
        ));

        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();

        when(rolePermissionRepository.findByIdRoleIdIn(any())).thenReturn(List.of(
                new RolePermission(operationsRoleId, p1, adminId),
                new RolePermission(operationsRoleId, p2, adminId)
        ));

        when(permissionRepository.findAllById(Set.of(p1, p2))).thenReturn(List.of(
                new PermissionEntity("CUSTOMER_VIEW", "View customers", "Customer"),
                new PermissionEntity("KYC_REVIEW", "Review KYC", "KYC")
        ));

        // DENY KYC_REVIEW
        when(userPermissionRepository.findByIdUserId(userId)).thenReturn(List.of(
                new UserPermission(userId, p2, "DENY", adminId)
        ));
        when(permissionRepository.findAllById(Set.of(p2))).thenReturn(List.of(
                new PermissionEntity("KYC_REVIEW", "Review KYC", "KYC")
        ));

        List<String> effective = authorizationService.getEffectivePermissions(userId);

        assertEquals(1, effective.size());
        assertTrue(effective.contains("CUSTOMER_VIEW"));
        assertFalse(effective.contains("KYC_REVIEW"));
        assertFalse(authorizationService.hasPermission(userId, "KYC_REVIEW"));
    }

    @Test
    @DisplayName("Preventing MANAGER from creating or assigning ADMIN or MANAGER roles")
    void testPreventManagerFromAssigningAdminOrManager() {
        Customer target = mock(Customer.class);
        when(customerRepository.findById(userId)).thenReturn(Optional.of(target));

        // actor is MANAGER
        when(userRoleRepository.findByIdUserId(managerId)).thenReturn(List.of(
                new UserRole(managerId, managerRoleId, adminId)
        ));

        ApiException ex1 = assertThrows(ApiException.class, () ->
                authorizationService.assignRole(managerId, userId, "ADMIN")
        );
        assertEquals(HttpStatus.FORBIDDEN, ex1.getStatus());
        assertTrue(ex1.getMessage().contains("cannot assign ADMIN or MANAGER"));

        ApiException ex2 = assertThrows(ApiException.class, () ->
                authorizationService.assignRole(managerId, userId, "MANAGER")
        );
        assertEquals(HttpStatus.FORBIDDEN, ex2.getStatus());
        assertTrue(ex2.getMessage().contains("cannot assign ADMIN or MANAGER"));
    }

    @Test
    @DisplayName("Preventing MANAGER from modifying ADMIN privileges")
    void testPreventManagerFromModifyingAdminPrivileges() {
        Customer adminUser = mock(Customer.class);
        when(customerRepository.findById(adminId)).thenReturn(Optional.of(adminUser));

        // actor is MANAGER
        when(userRoleRepository.findByIdUserId(managerId)).thenReturn(List.of(
                new UserRole(managerId, managerRoleId, UUID.randomUUID())
        ));
        // target is ADMIN
        when(userRoleRepository.findByIdUserId(adminId)).thenReturn(List.of(
                new UserRole(adminId, adminRoleId, UUID.randomUUID())
        ));

        ApiException ex = assertThrows(ApiException.class, () ->
                authorizationService.assignRole(managerId, adminId, "OPERATIONS")
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertTrue(ex.getMessage().contains("cannot modify ADMIN accounts"));
    }

    @Test
    @DisplayName("Preventing MANAGER from modifying their own privileges")
    void testPreventManagerFromModifyingOwnPrivileges() {
        Customer mgr = mock(Customer.class);
        when(customerRepository.findById(managerId)).thenReturn(Optional.of(mgr));

        when(userRoleRepository.findByIdUserId(managerId)).thenReturn(List.of(
                new UserRole(managerId, managerRoleId, UUID.randomUUID())
        ));

        ApiException ex = assertThrows(ApiException.class, () ->
                authorizationService.assignRole(managerId, managerId, "ADMIN")
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertTrue(ex.getMessage().contains("modify their own privileges"));
    }

    @Test
    @DisplayName("ADMIN role and permission management works and saves audit log")
    void testAdminRoleAndPermissionAssignment() {
        Customer target = mock(Customer.class);
        when(customerRepository.findById(userId)).thenReturn(Optional.of(target));

        // actor is ADMIN
        when(userRoleRepository.findByIdUserId(adminId)).thenReturn(List.of(
                new UserRole(adminId, adminRoleId, UUID.randomUUID())
        ));

        when(userRoleRepository.existsByIdUserIdAndIdRoleId(userId, operationsRole.getId())).thenReturn(false);

        authorizationService.assignRole(adminId, userId, "OPERATIONS");

        verify(userRoleRepository).save(any(UserRole.class));
        verify(auditLogRepository).save(any(AuthorizationAuditLog.class));
    }
}
