package com.fintech.identity.security;

import com.fintech.identity.model.Customer;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

@Service
public class JwtService {

    @Value("${identity.jwt.issuer}")
    private String issuer;

    @Value("${identity.jwt.access-token-minutes:15}")
    private long accessTokenMinutes;

    @Value("${identity.jwt.mfa-token-minutes:5}")
    private long mfaTokenMinutes;

    @Value("${identity.jwt.private-key-path}")
    private String privateKeyPath;

    @Value("${identity.jwt.public-key-path}")
    private String publicKeyPath;

    private RSAPrivateKey privateKey;
    private RSAPublicKey publicKey;
    private JwtEncoder encoder;
    private JwtDecoder decoder;

    @jakarta.annotation.PostConstruct
    public void initialize() {
        try {
            privateKey = readPrivateKey(Path.of(privateKeyPath));
            publicKey = readPublicKey(Path.of(publicKeyPath));

            // Build the RSA key pair for signing JWTs
            RSAKey rsaKey = new RSAKey.Builder(publicKey)
                    .privateKey(privateKey)
                    .keyID("fintech-rsa-1")
                    .build();

            JWKSource<SecurityContext> jwkSource =
                    new ImmutableJWKSet<>(new JWKSet(rsaKey));

            // Initialize the encoder (this was missing)
            encoder = new NimbusJwtEncoder(jwkSource);

            // Initialize the decoder for verifying JWT signatures
            NimbusJwtDecoder nimbusDecoder = NimbusJwtDecoder
                    .withPublicKey(publicKey)
                    .signatureAlgorithm(SignatureAlgorithm.RS256)
                    .build();

            nimbusDecoder.setJwtValidator(
                    JwtValidators.createDefaultWithIssuer(issuer)
            );

            decoder = nimbusDecoder;

        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Unable to initialize RSA JWT keys. Check key paths and formats.",
                    ex
            );
        }
    }

    public String createMfaToken(Customer customer, String referenceId) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(customer.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(mfaTokenMinutes * 60))
                .claim("token_use", "MFA")
                .claim("mfa_reference_id", referenceId)
                .build();

        return encode(claims);
    }

    public String createAccessToken(Customer customer) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(customer.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(accessTokenMinutes * 60))
                .claim("token_use", "ACCESS")
                .claim("roles", List.of(customer.getRole().name()))
                .build();

        return encode(claims);
    }

    private String encode(JwtClaimsSet claims) {
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256)
                .keyId("fintech-rsa-1")
                .build();

        return encoder.encode(
                JwtEncoderParameters.from(header, claims)
        ).getTokenValue();
    }

    public JwtDecoder jwtDecoder() {
        return decoder;
    }

    public long getAccessTokenSeconds() {
        return accessTokenMinutes * 60;
    }

    private RSAPrivateKey readPrivateKey(Path path) throws Exception {
        String pem = Files.readString(path)
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        byte[] bytes = Base64.getDecoder().decode(pem);

        return (RSAPrivateKey) KeyFactory.getInstance("RSA")
                .generatePrivate(new PKCS8EncodedKeySpec(bytes));
    }

    private RSAPublicKey readPublicKey(Path path) throws Exception {
        String pem = Files.readString(path)
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");

        byte[] bytes = Base64.getDecoder().decode(pem);

        return (RSAPublicKey) KeyFactory.getInstance("RSA")
                .generatePublic(new X509EncodedKeySpec(bytes));
    }
}