package com.fintech.identity.service;

import com.fintech.identity.dto.request.CreateManagerUserRequest;
import com.fintech.identity.dto.request.CreateOperationsUserRequest;
import com.fintech.identity.dto.response.ManagerUserResponse;
import com.fintech.identity.dto.response.OperationsUserResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.*;
import com.fintech.identity.model.enums.Role;
import com.fintech.identity.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class InternalUserService {

    private final CustomerRepository customerRepository;
    private final OperationsProfileRepository operationsProfileRepository;
    private final ManagerProfileRepository managerProfileRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuthorizationAuditLogRepository auditLogRepository;
    private final AuthorizationService authorizationService;
    private final PasswordEncoder passwordEncoder;

    public InternalUserService(
            CustomerRepository customerRepository,
            OperationsProfileRepository operationsProfileRepository,
            ManagerProfileRepository managerProfileRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            AuthorizationAuditLogRepository auditLogRepository,
            AuthorizationService authorizationService,
            PasswordEncoder passwordEncoder
    ) {
        this.customerRepository = customerRepository;
        this.operationsProfileRepository = operationsProfileRepository;
        this.managerProfileRepository = managerProfileRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.auditLogRepository = auditLogRepository;
        this.authorizationService = authorizationService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public OperationsUserResponse createOperationsUser(UUID actorUserId, CreateOperationsUserRequest request) {
        if (actorUserId != null) {
            boolean isAdmin = authorizationService.hasRole(actorUserId, "ADMIN");
            boolean isManager = authorizationService.hasRole(actorUserId, "MANAGER");

            if (!isAdmin && !isManager) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "FORBIDDEN",
                        "Only MANAGER or ADMIN can create an OPERATIONS user."
                );
            }
        }

        String mobile = request.mobileNumber().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String employeeCode = request.employeeCode().trim();

        if (customerRepository.existsByMobileNumber(mobile)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "MOBILE_ALREADY_REGISTERED",
                    "Mobile number is already registered."
            );
        }

        if (customerRepository.existsByEmail(email)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_REGISTERED",
                    "Email address is already registered."
            );
        }

        if (operationsProfileRepository.existsByEmployeeCode(employeeCode)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMPLOYEE_CODE_ALREADY_EXISTS",
                    "Employee code is already registered."
            );
        }

        Customer manager = customerRepository.findById(request.managerId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "INVALID_MANAGER",
                        "Designated manager was not found."
                ));

        boolean managerHasValidRole = authorizationService.hasRole(manager.getId(), "MANAGER")
                || authorizationService.hasRole(manager.getId(), "ADMIN");
        if (!managerHasValidRole && manager.getRole() != Role.MANAGER && manager.getRole() != Role.ADMIN) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_MANAGER",
                    "Assigned manager must have MANAGER or ADMIN role."
            );
        }

        Customer customer = new Customer(
                mobile,
                email,
                passwordEncoder.encode(request.password()),
                "INTERNAL_TERMS_V1",
                false,
                Role.OPERATIONS
        );
        customer.activate();
        Customer savedCustomer = customerRepository.saveAndFlush(customer);

        OperationsProfile profile = new OperationsProfile(
                savedCustomer.getId(),
                employeeCode,
                request.department().trim(),
                request.designation() != null ? request.designation().trim() : null,
                request.managerId()
        );
        operationsProfileRepository.save(profile);

        RoleEntity role = roleRepository.findByName("OPERATIONS")
                .orElseGet(() -> roleRepository.save(new RoleEntity("OPERATIONS", "Internal bank employee")));

        userRoleRepository.save(new UserRole(savedCustomer.getId(), role.getId(), actorUserId));

        auditLogRepository.save(new AuthorizationAuditLog(
                actorUserId,
                savedCustomer.getId(),
                "USER_CREATED",
                null,
                "OPERATIONS:" + employeeCode
        ));

        return new OperationsUserResponse(
                savedCustomer.getId(),
                maskMobile(savedCustomer.getMobileNumber()),
                maskEmail(savedCustomer.getEmail()),
                profile.getEmployeeCode(),
                profile.getDepartment(),
                profile.getDesignation(),
                profile.getManagerId(),
                savedCustomer.getStatus().name(),
                List.of("OPERATIONS"),
                profile.getCreatedAt()
        );
    }

    @Transactional
    public ManagerUserResponse createManagerUser(UUID actorUserId, CreateManagerUserRequest request) {
        if (actorUserId != null) {
            boolean isAdmin = authorizationService.hasRole(actorUserId, "ADMIN");
            if (!isAdmin) {
                throw new ApiException(
                        HttpStatus.FORBIDDEN,
                        "FORBIDDEN",
                        "Only ADMIN can create a MANAGER."
                );
            }
        }

        String mobile = request.mobileNumber().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String managerCode = request.managerCode().trim();

        if (customerRepository.existsByMobileNumber(mobile)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "MOBILE_ALREADY_REGISTERED",
                    "Mobile number is already registered."
            );
        }

        if (customerRepository.existsByEmail(email)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_REGISTERED",
                    "Email address is already registered."
            );
        }

        if (managerProfileRepository.existsByManagerCode(managerCode)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "MANAGER_CODE_ALREADY_EXISTS",
                    "Manager code is already registered."
            );
        }

        Customer customer = new Customer(
                mobile,
                email,
                passwordEncoder.encode(request.password()),
                "INTERNAL_TERMS_V1",
                false,
                Role.MANAGER
        );
        customer.activate();
        Customer savedCustomer = customerRepository.saveAndFlush(customer);

        ManagerProfile profile = new ManagerProfile(
                savedCustomer.getId(),
                managerCode,
                request.department().trim()
        );
        managerProfileRepository.save(profile);

        RoleEntity role = roleRepository.findByName("MANAGER")
                .orElseGet(() -> roleRepository.save(new RoleEntity("MANAGER", "Bank manager")));

        userRoleRepository.save(new UserRole(savedCustomer.getId(), role.getId(), actorUserId));

        auditLogRepository.save(new AuthorizationAuditLog(
                actorUserId,
                savedCustomer.getId(),
                "USER_CREATED",
                null,
                "MANAGER:" + managerCode
        ));

        return new ManagerUserResponse(
                savedCustomer.getId(),
                maskMobile(savedCustomer.getMobileNumber()),
                maskEmail(savedCustomer.getEmail()),
                profile.getManagerCode(),
                profile.getDepartment(),
                savedCustomer.getStatus().name(),
                List.of("MANAGER"),
                profile.getCreatedAt()
        );
    }

    private String maskMobile(String mobile) {
        if (mobile == null || mobile.length() < 5) return "******";
        return "******" + mobile.substring(mobile.length() - 4);
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        String local = email.substring(0, at);
        String domain = email.substring(at + 1);
        return local.substring(0, 1) + "***@" + domain;
    }
}
