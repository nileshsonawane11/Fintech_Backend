package com.fintech.ledger.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class InternalServiceAuthFilter extends OncePerRequestFilter {

    private final String internalSecretToken;

    public InternalServiceAuthFilter(
            @Value("${security.internal.secret-token:finbank-internal-secret-token}") String internalSecretToken) {
        this.internalSecretToken = internalSecretToken;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (path.startsWith("/internal/") || path.startsWith("/api/v1/holds/reserve") || path.startsWith("/api/v1/holds/release")) {
            String authHeader = request.getHeader("Authorization");
            String internalHeader = request.getHeader("X-Internal-Service-Secret");

            boolean isValidSecret = (internalHeader != null && internalHeader.equals(internalSecretToken)) ||
                    (authHeader != null && authHeader.equalsIgnoreCase("Bearer " + internalSecretToken));

            if (isValidSecret) {
                List<SimpleGrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_SYSTEM"),
                        new SimpleGrantedAuthority("ROLE_INTERNAL"),
                        new SimpleGrantedAuthority("LEDGER_POSTING_CREATE"),
                        new SimpleGrantedAuthority("LEDGER_ACCOUNT_READ_INTERNAL"),
                        new SimpleGrantedAuthority("LEDGER_BALANCE_READ_INTERNAL"),
                        new SimpleGrantedAuthority("LEDGER_HOLD_CREATE_INTERNAL"),
                        new SimpleGrantedAuthority("LEDGER_HOLD_RELEASE_INTERNAL")
                );
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken("internal-service", null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
