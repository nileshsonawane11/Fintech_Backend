package com.fintech.payment.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Set;

public final class SecurityUtils {

    private static final Set<String> OPS_ROLES = Set.of(
            "ROLE_OPERATIONS", "ROLE_ADMIN", "ROLE_MANAGER", "ROLE_BANK_MANAGER"
    );

    private SecurityUtils() {
    }

    public static String getAuthenticatedSubject(Jwt jwt) {
        if (jwt != null && jwt.getSubject() != null && !jwt.getSubject().isBlank()) {
            return jwt.getSubject();
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt principalJwt) {
            return principalJwt.getSubject();
        }
        return authentication != null ? authentication.getName() : null;
    }

    public static String getBearerToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getTokenValue();
        }
        return null;
    }

    public static boolean isOperationsOrAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (OPS_ROLES.contains(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    public static String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.length() < 4) {
            return "****";
        }
        return "**********" + accountNumber.substring(accountNumber.length() - 4);
    }

    public static String maskVpa(String vpa) {
        if (vpa == null || !vpa.contains("@")) {
            return "****";
        }
        int atIndex = vpa.indexOf('@');
        String user = vpa.substring(0, atIndex);
        String handle = vpa.substring(atIndex);
        if (user.length() <= 2) {
            return "**" + handle;
        }
        return user.substring(0, 2) + "***" + handle;
    }
}
