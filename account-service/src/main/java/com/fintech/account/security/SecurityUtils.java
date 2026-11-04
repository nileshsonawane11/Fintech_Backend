package com.fintech.account.security;

import com.fintech.account.exception.AccountException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static String getAuthenticatedSubject() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw AccountException.unauthorized("Authentication required");
        }

        if (auth.getPrincipal() instanceof Jwt jwt) {
            String sub = jwt.getSubject();
            if (sub != null && !sub.isBlank()) {
                return sub;
            }
        }

        String name = auth.getName();
        if (name != null && !name.isBlank() && !"anonymousUser".equals(name)) {
            return name;
        }

        throw AccountException.unauthorized("Invalid authenticated identity subject");
    }

    public static boolean hasAuthority(String authority) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if (ga.getAuthority().equalsIgnoreCase(authority)) {
                return true;
            }
        }
        return false;
    }

    public static boolean isOperationsOrAdmin() {
        return hasAuthority("ROLE_OPERATIONS") || hasAuthority("ROLE_ADMIN") || hasAuthority("ROLE_MANAGER") ||
               hasAuthority("ACCOUNT_READ_ALL");
    }

    public static String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.length() < 4) {
            return "************0000";
        }
        int len = accountNumber.length();
        String last4 = accountNumber.substring(len - 4);
        return "*".repeat(Math.max(0, len - 4)) + last4;
    }

    public static String maskMobileNumber(String mobileNumber) {
        if (mobileNumber == null || mobileNumber.length() < 4) {
            return "******00";
        }
        int len = mobileNumber.length();
        String last2 = mobileNumber.substring(len - 2);
        return "*".repeat(Math.max(0, len - 2)) + last2;
    }
}
