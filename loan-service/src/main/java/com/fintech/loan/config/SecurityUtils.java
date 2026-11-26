package com.fintech.loan.config;

import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Set;
import java.util.stream.Collectors;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static String getAuthenticatedSubject() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED",
                    "A valid authenticated identity is required.");
        }
        if (auth.getPrincipal() instanceof Jwt jwt && jwt.getSubject() != null && !jwt.getSubject().isBlank()) {
            return jwt.getSubject();
        }
        if (auth.getName() != null && !auth.getName().isBlank()) {
            return auth.getName();
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED",
                "Authenticated subject could not be resolved from JWT.");
    }

    public static String getBearerToken() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getTokenValue();
        }
        return null;
    }

    public static Set<String> getAuthorities() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return Set.of();
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }

    public static boolean hasAnyRole(String... roles) {
        Set<String> authorities = getAuthorities();
        for (String role : roles) {
            String roleAuthority = role.startsWith(LoanConstants.ROLE_PREFIX)
                    ? role
                    : LoanConstants.ROLE_PREFIX + role;
            if (authorities.contains(roleAuthority)) {
                return true;
            }
        }
        return false;
    }

    public static boolean isAdmin() {
        return hasAnyRole(LoanConstants.ROLE_ADMIN);
    }

    public static boolean isLoanManagerOrAdmin() {
        return hasAnyRole(LoanConstants.ROLE_LOAN_MANAGER, LoanConstants.ROLE_MANAGER, LoanConstants.ROLE_ADMIN);
    }

    public static boolean isLoanStaff() {
        return hasAnyRole(
                LoanConstants.ROLE_LOAN_OFFICER,
                LoanConstants.ROLE_LOAN_MANAGER,
                LoanConstants.ROLE_OPERATIONS,
                LoanConstants.ROLE_MANAGER,
                LoanConstants.ROLE_ADMIN
        );
    }

    public static String resolveActorRole() {
        if (hasAnyRole(LoanConstants.ROLE_ADMIN)) return LoanConstants.ROLE_ADMIN;
        if (hasAnyRole(LoanConstants.ROLE_LOAN_MANAGER)) return LoanConstants.ROLE_LOAN_MANAGER;
        if (hasAnyRole(LoanConstants.ROLE_MANAGER)) return LoanConstants.ROLE_MANAGER;
        if (hasAnyRole(LoanConstants.ROLE_LOAN_OFFICER)) return LoanConstants.ROLE_LOAN_OFFICER;
        if (hasAnyRole(LoanConstants.ROLE_OPERATIONS)) return LoanConstants.ROLE_OPERATIONS;
        return LoanConstants.ROLE_CUSTOMER;
    }
}
