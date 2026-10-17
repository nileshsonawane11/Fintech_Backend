
package com.fintech.gateway.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class JwtSecurityConfig {

    @Value("${jwt.public-key-path:./keys/public.pem}")
    private String publicKeyPath;

    @Value("${jwt.issuer}")
    private String issuer;

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(
            ServerHttpSecurity http) {

        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)

                .authorizeExchange(exchanges -> exchanges
                        // Registration, login, MFA and refresh endpoints
                        .pathMatchers(
                                "/api/v1/auth/**"
                        ).permitAll()

                        // Health endpoint
                        .pathMatchers(
                                "/actuator/health"
                        ).permitAll()

                        .pathMatchers(
                                "/actuator/health/**"
                        ).permitAll()

                        // All remaining routes require a valid JWT
                        .anyExchange().authenticated()
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(Customizer.withDefaults())
                )

                .build();
    }

    @Bean
    public ReactiveJwtDecoder jwtDecoder() throws Exception {

        RSAPublicKey publicKey = loadPublicKey();

        NimbusReactiveJwtDecoder decoder =
                NimbusReactiveJwtDecoder
                        .withPublicKey(publicKey)
                        .build();

        // Validate issuer, expiration and not-before timestamps.
        OAuth2TokenValidator<Jwt> issuerValidator =
                JwtValidators.createDefaultWithIssuer(issuer);

        // Reject MFA tokens and any token that isn't an ACCESS token.
        OAuth2TokenValidator<Jwt> accessTokenValidator = jwt -> {

            String tokenUse = jwt.getClaimAsString("token_use");

            if ("ACCESS".equals(tokenUse)) {
                return OAuth2TokenValidatorResult.success();
            }

            OAuth2Error error = new OAuth2Error(
                    "invalid_token",
                    "A valid access token is required.",
                    null
            );

            return OAuth2TokenValidatorResult.failure(error);
        };

        decoder.setJwtValidator(
                new DelegatingOAuth2TokenValidator<>(
                        issuerValidator,
                        accessTokenValidator
                )
        );

        return decoder;
    }

    private RSAPublicKey loadPublicKey() throws Exception {

        Path keyPath = Path.of(publicKeyPath);

        if (!Files.isRegularFile(keyPath)) {
            throw new IllegalStateException(
                    "JWT public key file not found: " + keyPath
            );
        }

        String pem = Files.readString(keyPath);

        String encodedKey = pem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");

        byte[] decodedKey = Base64.getDecoder().decode(encodedKey);

        X509EncodedKeySpec keySpec =
                new X509EncodedKeySpec(decodedKey);

        KeyFactory keyFactory = KeyFactory.getInstance("RSA");

        return (RSAPublicKey) keyFactory.generatePublic(keySpec);
    }
}