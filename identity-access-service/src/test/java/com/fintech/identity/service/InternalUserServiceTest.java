package com.fintech.identity.service;

import com.fintech.identity.dto.request.CreateManagerUserRequest;
import com.fintech.identity.dto.request.CreateOperationsUserRequest;
import com.fintech.identity.dto.response.ManagerUserResponse;
import com.fintech.identity.dto.response.OperationsUserResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.Customer;
import com.fintech.identity.model.OperationsProfile;
import com.fintech.identity.model.RoleEntity;
import com.fintech.identity.model.UserRole;
import com.fintech.identity.model.enums.Role;
import com.fintech.identity.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InternalUserServiceTest {

    private CustomerRepository customerRepository;
    private OperationsProfileRepository operationsProfileRepository;
    private ManagerProfileRepository managerProfileRepository;
    private RoleRepository roleRepository;
    private UserRoleRepository userRoleRepository;
    private AuthorizationAuditLogRepository auditLogRepository;
    private AuthorizationService authorizationService;
    private PasswordEncoder passwordEncoder;

    private InternalUserService internalUserService;

    private final UUID adminId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        customerRepository = mock(CustomerRepository.class);
        operationsProfileRepository = mock(OperationsProfileRepository.class);
        managerProfileRepository = mock(ManagerProfileRepository.class);
        roleRepository = mock(RoleRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        auditLogRepository = mock(AuthorizationAuditLogRepository.class);
        authorizationService = mock(AuthorizationService.class);
        passwordEncoder = mock(PasswordEncoder.class);

        internalUserService = new InternalUserService(
                customerRepository,
                operationsProfileRepository,
                managerProfileRepository,
                roleRepository,
                userRoleRepository,
                auditLogRepository,
                authorizationService,
                passwordEncoder
        );

        when(authorizationService.hasRole(adminId, "ADMIN")).thenReturn(true);
        when(authorizationService.hasRole(managerId, "MANAGER")).thenReturn(true);
        when(authorizationService.hasRole(customerId, "CUSTOMER")).thenReturn(true);

        when(roleRepository.findByName("OPERATIONS"))
                .thenReturn(Optional.of(new RoleEntity("OPERATIONS", "Internal bank employee")));
        when(roleRepository.findByName("MANAGER"))
                .thenReturn(Optional.of(new RoleEntity("MANAGER", "Bank manager")));

        when(passwordEncoder.encode(any())).thenReturn("hashed_pass");
    }

    @Test
    @DisplayName("Creating an OPERATIONS user as MANAGER succeeds")
    void testCreateOperationsUserAsManager() {
        CreateOperationsUserRequest request = new CreateOperationsUserRequest(
                "9876543210",
                "ops1@finbank.com",
                "Password123!",
                "EMP-001",
                "KYC Department",
                "KYC Analyst",
                managerId
        );

        Customer managerCustomer = new Customer("9999999999", "mgr@finbank.com", "h", "V1", false, Role.MANAGER);
        when(customerRepository.findById(managerId)).thenReturn(Optional.of(managerCustomer));

        Customer createdOps = new Customer("9876543210", "ops1@finbank.com", "hashed_pass", "INTERNAL_TERMS_V1", false, Role.OPERATIONS);
        when(customerRepository.saveAndFlush(any())).thenReturn(createdOps);

        OperationsUserResponse response = internalUserService.createOperationsUser(managerId, request);

        assertNotNull(response);
        assertEquals("EMP-001", response.employeeCode());
        assertEquals("KYC Department", response.department());
        verify(operationsProfileRepository).save(any(OperationsProfile.class));
        verify(userRoleRepository).save(any(UserRole.class));
    }

    @Test
    @DisplayName("Creating an OPERATIONS user as ADMIN succeeds")
    void testCreateOperationsUserAsAdmin() {
        CreateOperationsUserRequest request = new CreateOperationsUserRequest(
                "9876543210",
                "ops2@finbank.com",
                "Password123!",
                "EMP-002",
                "Payments Ops",
                "Operator",
                managerId
        );

        Customer managerCustomer = new Customer("9999999999", "mgr@finbank.com", "h", "V1", false, Role.MANAGER);
        when(customerRepository.findById(managerId)).thenReturn(Optional.of(managerCustomer));

        Customer createdOps = new Customer("9876543210", "ops2@finbank.com", "hashed_pass", "INTERNAL_TERMS_V1", false, Role.OPERATIONS);
        when(customerRepository.saveAndFlush(any())).thenReturn(createdOps);

        OperationsUserResponse response = internalUserService.createOperationsUser(adminId, request);

        assertNotNull(response);
        assertEquals("EMP-002", response.employeeCode());
        verify(operationsProfileRepository).save(any(OperationsProfile.class));
    }

    @Test
    @DisplayName("Preventing CUSTOMER from creating OPERATIONS user")
    void testPreventCustomerFromCreatingOperations() {
        CreateOperationsUserRequest request = new CreateOperationsUserRequest(
                "9876543210",
                "ops@finbank.com",
                "Password123!",
                "EMP-003",
                "Dept",
                "Desig",
                managerId
        );

        ApiException ex = assertThrows(ApiException.class, () ->
                internalUserService.createOperationsUser(customerId, request)
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertTrue(ex.getMessage().contains("Only MANAGER or ADMIN"));
    }

    @Test
    @DisplayName("Creating a MANAGER user as ADMIN succeeds")
    void testCreateManagerUserAsAdmin() {
        CreateManagerUserRequest request = new CreateManagerUserRequest(
                "9876543212",
                "newmgr@finbank.com",
                "Password123!",
                "MGR-002",
                "Risk Management"
        );

        Customer createdMgr = new Customer("9876543212", "newmgr@finbank.com", "hashed_pass", "INTERNAL_TERMS_V1", false, Role.MANAGER);
        when(customerRepository.saveAndFlush(any())).thenReturn(createdMgr);

        ManagerUserResponse response = internalUserService.createManagerUser(adminId, request);

        assertNotNull(response);
        assertEquals("MGR-002", response.managerCode());
        assertEquals("Risk Management", response.department());
        verify(managerProfileRepository).save(any());
        verify(userRoleRepository).save(any(UserRole.class));
    }

    @Test
    @DisplayName("Preventing MANAGER from creating MANAGER user")
    void testPreventManagerFromCreatingManager() {
        CreateManagerUserRequest request = new CreateManagerUserRequest(
                "9876543212",
                "mgr2@finbank.com",
                "Password123!",
                "MGR-003",
                "Dept"
        );

        ApiException ex = assertThrows(ApiException.class, () ->
                internalUserService.createManagerUser(managerId, request)
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertTrue(ex.getMessage().contains("Only ADMIN can create a MANAGER"));
    }

    @Test
    @DisplayName("Preventing duplicate employee code")
    void testDuplicateEmployeeCodeThrowsConflict() {
        CreateOperationsUserRequest request = new CreateOperationsUserRequest(
                "9876543210",
                "ops@finbank.com",
                "Password123!",
                "EMP-DUP",
                "Dept",
                "Desig",
                managerId
        );

        when(operationsProfileRepository.existsByEmployeeCode("EMP-DUP")).thenReturn(true);

        ApiException ex = assertThrows(ApiException.class, () ->
                internalUserService.createOperationsUser(adminId, request)
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("EMPLOYEE_CODE_ALREADY_EXISTS", ex.getCode());
    }
}
