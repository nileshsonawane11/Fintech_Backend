package com.fintech.payment.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.core.convert.converter.Converter;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityConfigTest {

    private final Converter<Jwt, AbstractAuthenticationToken> converter =
            new SecurityConfig().jwtAuthenticationConverter();

    @Test
    void rejectsTemporaryMfaTokenForPaymentApis() {
        Jwt token = jwt("MFA");

        assertThrows(InvalidBearerTokenException.class, () -> converter.convert(token));
    }

    @Test
    void acceptsAccessTokenAndMapsItsCustomerRole() {
        AbstractAuthenticationToken authentication = converter.convert(jwt("ACCESS"));

        assertEquals("customer-1", authentication.getName());
        assertTrue(authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
    }

    private static Jwt jwt(String tokenUse) {
        return Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .issuer("fintech-identity-service")
                .subject("customer-1")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .claim("token_use", tokenUse)
                .claim("roles", List.of("CUSTOMER"))
                .build();
    }
}
