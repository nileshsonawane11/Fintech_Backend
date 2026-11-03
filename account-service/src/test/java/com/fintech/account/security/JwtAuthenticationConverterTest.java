package com.fintech.account.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JwtAuthenticationConverterTest {

    private final JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

    @Test
    @DisplayName("Maps roles claim with ROLE_ prefix and keeps permissions without prefix")
    void testConverterMapsRolesAndPermissionsCorrectly() {
        Jwt jwt = Jwt.withTokenValue("sample-token")
                .header("alg", "RS256")
                .issuer("identity-service")
                .subject("cust-12345")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .claim("token_use", "ACCESS")
                .claim("roles", List.of("CUSTOMER", "OPERATIONS"))
                .claim("permissions", List.of("ACCOUNT_PRODUCT_READ", "ACCOUNT_APPLY", "ACCOUNT_HOLD_CREATE"))
                .build();

        AbstractAuthenticationToken auth = converter.convert(jwt);

        assertNotNull(auth);
        assertEquals("cust-12345", auth.getName());

        Collection<GrantedAuthority> authorities = auth.getAuthorities();
        List<String> authStrings = authorities.stream().map(GrantedAuthority::getAuthority).toList();

        assertTrue(authStrings.contains("ROLE_CUSTOMER"));
        assertTrue(authStrings.contains("ROLE_OPERATIONS"));
        assertTrue(authStrings.contains("ACCOUNT_PRODUCT_READ"));
        assertTrue(authStrings.contains("ACCOUNT_APPLY"));
        assertTrue(authStrings.contains("ACCOUNT_HOLD_CREATE"));
    }

    @Test
    void testMockitoMockingWithoutAgent() {
        Runnable mockRunnable = Mockito.mock(Runnable.class);
        mockRunnable.run();
        Mockito.verify(mockRunnable).run();
    }
}