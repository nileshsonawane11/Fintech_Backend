package com.fintech.card.security;

import com.fintech.card.config.JwtAuthenticationConverter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CardSecurityTest {

    private final JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

    @Test
    @DisplayName("Maps roles claim with ROLE_ prefix and keeps permissions without prefix")
    void testConverterMapsRolesAndPermissionsCorrectly() {
        Jwt jwt = Jwt.withTokenValue("sample-token")
                .header("alg", "RS256")
                .issuer("identity-service")
                .subject("CUS-100234")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .claim("token_use", "ACCESS")
                .claim("roles", List.of("CUSTOMER", "OPERATIONS"))
                .claim("permissions", List.of("CARD_APPLY", "CARD_VIEW", "CARD_ADMIN"))
                .build();

        AbstractAuthenticationToken auth = converter.convert(jwt);

        assertNotNull(auth);
        assertEquals("CUS-100234", auth.getName());

        Collection<GrantedAuthority> authorities = auth.getAuthorities();
        List<String> authStrings = authorities.stream().map(GrantedAuthority::getAuthority).toList();

        assertTrue(authStrings.contains("ROLE_CUSTOMER"));
        assertTrue(authStrings.contains("ROLE_OPERATIONS"));
        assertTrue(authStrings.contains("CARD_APPLY"));
        assertTrue(authStrings.contains("CARD_VIEW"));
        assertTrue(authStrings.contains("CARD_ADMIN"));
    }

    @Test
    @DisplayName("Handles empty roles and permissions gracefully")
    void testConverterHandlesEmptyRolesAndPermissions() {
        Jwt jwt = Jwt.withTokenValue("sample-token")
                .header("alg", "RS256")
                .issuer("identity-service")
                .subject("CUS-999")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        AbstractAuthenticationToken auth = converter.convert(jwt);

        assertNotNull(auth);
        assertEquals("CUS-999", auth.getName());
        assertTrue(auth.getAuthorities().isEmpty());
    }

    @Test
    @DisplayName("Avoids duplicate ROLE_ prefix if already present in role list")
    void testAvoidsDuplicateRolePrefix() {
        Jwt jwt = Jwt.withTokenValue("sample-token")
                .header("alg", "RS256")
                .issuer("identity-service")
                .subject("OPS-101")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .claim("roles", List.of("ROLE_OPERATIONS"))
                .claim("permissions", List.of("CARD_APPLICATION_APPROVE"))
                .build();

        AbstractAuthenticationToken auth = converter.convert(jwt);
        List<String> authStrings = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();

        assertEquals(2, authStrings.size());
        assertTrue(authStrings.contains("ROLE_OPERATIONS"));
        assertFalse(authStrings.contains("ROLE_ROLE_OPERATIONS"));
        assertTrue(authStrings.contains("CARD_APPLICATION_APPROVE"));
    }
}
