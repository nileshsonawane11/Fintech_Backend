package com.fintech.payment.security;

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
        if (path.startsWith("/internal/")) {
            String internalHeader = request.getHeader("X-Internal-Service-Secret");
            String authHeader = request.getHeader("Authorization");
            boolean valid = (internalHeader != null && internalHeader.equals(internalSecretToken))
                    || (authHeader != null && authHeader.equalsIgnoreCase("Bearer " + internalSecretToken));
            if (valid) {
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        "internal-service",
                        null,
                        List.of(
                                new SimpleGrantedAuthority("ROLE_SYSTEM"),
                                new SimpleGrantedAuthority("ROLE_INTERNAL")
                        )
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        filterChain.doFilter(request, response);
    }
}
