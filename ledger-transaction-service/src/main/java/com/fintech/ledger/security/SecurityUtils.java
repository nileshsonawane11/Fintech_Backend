package com.fintech.ledger.security;

import com.fintech.ledger.exception.LedgerException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static String getAuthenticatedSubject() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw LedgerException.unauthorized("Authentication required");
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

        throw LedgerException.unauthorized("Invalid authenticated identity subject");
    }

    public static UUID getAuthenticatedCustomerId() {
        String sub = getAuthenticatedSubject();
        try {
            return UUID.fromString(sub);
        } catch (IllegalArgumentException ex) {
            return null;
        }
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
               hasAuthority("TRANSACTION_READ_ALL");
    }

    public static boolean isInternalService() {
        return hasAuthority("ROLE_SYSTEM") || hasAuthority("ROLE_INTERNAL") || hasAuthority("ROLE_ADMIN") ||
               hasAuthority("LEDGER_POSTING_CREATE");
    }
}
