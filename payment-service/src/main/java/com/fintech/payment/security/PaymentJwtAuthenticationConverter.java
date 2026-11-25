
package com.fintech.payment.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class PaymentJwtAuthenticationConverter
        implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {

        // Accept only access tokens
        if (!"ACCESS".equals(jwt.getClaimAsString("token_use"))) {
            throw new InvalidBearerTokenException(
                    "An access token is required"
            );
        }

        List<GrantedAuthority> authorities = new ArrayList<>();

        // Map roles to Spring Security ROLE_ authorities
        List<String> roles = jwt.getClaimAsStringList("roles");

        if (roles != null) {
            for (String role : roles) {
                if (role != null && !role.isBlank()) {
                    authorities.add(
                            new SimpleGrantedAuthority(
                                    role.startsWith("ROLE_")
                                            ? role
                                            : "ROLE_" + role
                            )
                    );
                }
            }
        }

        // Map permissions directly to authorities
        List<String> permissions = jwt.getClaimAsStringList("permissions");

        if (permissions != null) {
            for (String permission : permissions) {
                if (permission != null && !permission.isBlank()) {
                    authorities.add(
                            new SimpleGrantedAuthority(permission)
                    );
                }
            }
        }

        return new JwtAuthenticationToken(
                jwt,
                authorities,
                jwt.getSubject()
        );
    }
}