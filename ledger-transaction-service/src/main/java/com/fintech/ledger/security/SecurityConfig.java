package com.fintech.ledger.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.converter.RsaKeyConverters;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.InputStream;
import java.security.interfaces.RSAPublicKey;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationConverter jwtAuthenticationConverter;
    private final InternalServiceAuthFilter internalServiceAuthFilter;

    public SecurityConfig(JwtAuthenticationConverter jwtAuthenticationConverter,
                          InternalServiceAuthFilter internalServiceAuthFilter) {
        this.jwtAuthenticationConverter = jwtAuthenticationConverter;
        this.internalServiceAuthFilter = internalServiceAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(internalServiceAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .requestMatchers("/internal/**").hasAnyRole("SYSTEM", "INTERNAL", "ADMIN")
                        .requestMatchers("/ops/**").hasAnyRole("OPERATIONS", "ADMIN", "MANAGER")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .jwtAuthenticationConverter(jwtAuthenticationConverter)
                        )
                );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${security.jwt.public-key-location:classpath:keys/public.pem}") Resource publicKeyResource,
            @Value("${security.jwt.issuer:identity-service}") String issuer) throws Exception {

        RSAPublicKey publicKey;
        try (InputStream input = publicKeyResource.getInputStream()) {
            publicKey = RsaKeyConverters.x509().convert(input);
        }

        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();

        OAuth2TokenValidator<Jwt> defaultValidators = JwtValidators.createDefaultWithIssuer(issuer);

        OAuth2TokenValidator<Jwt> accessTokenOnlyValidator = token -> {
            if ("ACCESS".equals(token.getClaimAsString("token_use")) || token.getClaimAsString("token_use") == null) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "An access token is required", null)
            );
        };

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(defaultValidators, accessTokenOnlyValidator));

        return decoder;
    }
}
