package com.fintech.identity.security;

import com.fintech.identity.config.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtAuthenticationConverterTest {

    private final JwtAuthenticationConverter converter = new SecurityConfig().jwtAuthenticationConverter();

    @Test
    @DisplayName("Maps roles claim with ROLE_ prefix and keeps permissions without prefix")
    void testConverterMapsRolesAndPermissionsCorrectly() {
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "RS256")
                .issuer("identity-service")
                .subject("11111111-1111-1111-1111-111111111111")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(1800))
                .claim("token_use", "ACCESS")
                .claim("roles", List.of("CUSTOMER", "OPERATIONS"))
                .claim("permissions", List.of("ACCOUNT_VIEW", "CUSTOMER_VIEW", "KYC_REVIEW"))
                .build();

        AbstractAuthenticationToken authentication = converter.convert(jwt);

        assertNotNull(authentication);
        Collection<GrantedAuthority> authorities = authentication.getAuthorities();
        System.out.println("AUTHORITIES: " + authorities);

        // Roles prefixed with ROLE_
        assertTrue(authorities.contains(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
        assertTrue(authorities.contains(new SimpleGrantedAuthority("ROLE_OPERATIONS")));

        // Permissions unchanged
        assertTrue(authorities.contains(new SimpleGrantedAuthority("ACCOUNT_VIEW")));
        assertTrue(authorities.contains(new SimpleGrantedAuthority("CUSTOMER_VIEW")));
        assertTrue(authorities.contains(new SimpleGrantedAuthority("KYC_REVIEW")));

        List<String> authorityStrings = authorities.stream().map(GrantedAuthority::getAuthority).toList();
        assertTrue(authorityStrings.contains("ROLE_CUSTOMER"));
        assertTrue(authorityStrings.contains("ROLE_OPERATIONS"));
        assertTrue(authorityStrings.contains("ACCOUNT_VIEW"));
        assertTrue(authorityStrings.contains("CUSTOMER_VIEW"));
        assertTrue(authorityStrings.contains("KYC_REVIEW"));
    }
}
