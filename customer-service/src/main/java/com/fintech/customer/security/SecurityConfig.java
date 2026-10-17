package com.fintech.customer.security;

import java.io.InputStream;
import java.util.Collection;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;

import java.security.interfaces.RSAPublicKey;
import org.springframework.security.converter.RsaKeyConverters;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info"
                        ).permitAll()
                        .requestMatchers("/ops/**")
                        .hasAuthority("ROLE_KYC_OPS")
                        .requestMatchers("/internal/**")
                        .hasAuthority("ROLE_INTERNAL_SERVICE")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(token -> {
                            List<String> roles = token.getClaimAsStringList("roles");

                            Collection<org.springframework.security.core.GrantedAuthority>
                                    authorities = roles == null
                                    ? List.of()
                                    : roles.stream()
                                    .map(role -> (org.springframework.security.core.GrantedAuthority)
                                            new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                                    role.startsWith("ROLE_")
                                                            ? role
                                                            : "ROLE_" + role))
                                    .toList();

                            return new JwtAuthenticationToken(
                                    token, authorities, token.getSubject()
                            );
                        }))
                );

        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(
            @Value("${security.jwt.public-key-location}") Resource publicKeyResource)
            throws Exception {

        RSAPublicKey publicKey;

        try (InputStream input = publicKeyResource.getInputStream()) {
            publicKey = RsaKeyConverters.x509().convert(input);
        }

        NimbusJwtDecoder decoder =
                NimbusJwtDecoder.withPublicKey(publicKey).build();

        OAuth2TokenValidator<Jwt> defaults =
                JwtValidators.createDefault();

        OAuth2TokenValidator<Jwt> accessTokenOnly = jwt -> {
            if ("ACCESS".equals(jwt.getClaimAsString("token_use"))) {
                return OAuth2TokenValidatorResult.success();
            }

            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error(
                            "invalid_token",
                            "An access token is required",
                            null
                    )
            );
        };

        decoder.setJwtValidator(
                new DelegatingOAuth2TokenValidator<>(defaults, accessTokenOnly)
        );

        return decoder;
    }
}