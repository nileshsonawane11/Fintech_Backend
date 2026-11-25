package com.fintech.payment.config;

import com.fintech.payment.security.PaymentJwtAuthenticationConverter;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityConfigTest {

    private final PaymentJwtAuthenticationConverter converter =
            new PaymentJwtAuthenticationConverter();

    @Test
    void rejectsTemporaryMfaTokenForPaymentApis() {

        Jwt token = jwt("MFA");

        assertThrows(
                InvalidBearerTokenException.class,
                () -> converter.convert(token)
        );
    }

    @Test
    void acceptsAccessTokenAndMapsItsCustomerRole() {

        AbstractAuthenticationToken authentication =
                converter.convert(jwt("ACCESS"));

        assertEquals("customer-1", authentication.getName());

        assertTrue(
                authentication.getAuthorities().contains(
                        new SimpleGrantedAuthority("ROLE_CUSTOMER")
                )
        );
    }

    @Test
    void mapsPermissionsToAuthorities() {

        Jwt token = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .issuer("fintech-identity-service")
                .subject("customer-1")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .claim("token_use", "ACCESS")
                .claim("roles", List.of("CUSTOMER"))
                .claim("permissions", List.of(
                        "PAYMENT_CREATE",
                        "PAYMENT_VIEW"
                ))
                .build();

        AbstractAuthenticationToken authentication =
                converter.convert(token);

        assertTrue(
                authentication.getAuthorities().contains(
                        new SimpleGrantedAuthority("PAYMENT_CREATE")
                )
        );

        assertTrue(
                authentication.getAuthorities().contains(
                        new SimpleGrantedAuthority("PAYMENT_VIEW")
                )
        );
    }

    @Test
    void supportsRolesAlreadyContainingRolePrefix() {

        Jwt token = Jwt.withTokenValue("test-token")
                .header("alg", "RS256")
                .subject("customer-1")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .claim("token_use", "ACCESS")
                .claim("roles", List.of("ROLE_ADMIN"))
                .build();

        AbstractAuthenticationToken authentication =
                converter.convert(token);

        assertTrue(
                authentication.getAuthorities().contains(
                        new SimpleGrantedAuthority("ROLE_ADMIN")
                )
        );
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