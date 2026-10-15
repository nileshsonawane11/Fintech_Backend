package com.fintech.identity.service;

import com.fintech.identity.dto.response.TokenResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.Customer;
import com.fintech.identity.model.RefreshToken;
import com.fintech.identity.repository.CustomerRepository;
import com.fintech.identity.repository.RefreshTokenRepository;
import com.fintech.identity.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final long REFRESH_TOKEN_LIFETIME_SECONDS =
            30L * 24 * 60 * 60;

    private final RefreshTokenRepository refreshTokenRepository;
    private final CustomerRepository customerRepository;
    private final JwtService jwtService;

    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            CustomerRepository customerRepository,
            JwtService jwtService
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.customerRepository = customerRepository;
        this.jwtService = jwtService;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public TokenResponse rotate(String rawRefreshToken) {
        String oldHash = sha256(rawRefreshToken);

        RefreshToken oldToken = refreshTokenRepository
                .findByTokenHashForUpdate(oldHash)
                .orElseThrow(() -> invalidRefreshToken());

        // Reuse of a rotated/revoked token is treated as possible theft.
        // Revoke every token in the family and commit that revocation.
        if (oldToken.isRevoked()) {
            refreshTokenRepository.findAllByFamilyId(oldToken.getFamilyId())
                    .forEach(RefreshToken::revoke);

            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_REFRESH_TOKEN",
                    "Token has been expired.1"
            );
        }

        if (oldToken.isExpired()) {
            oldToken.revoke();
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_REFRESH_TOKEN",
                    "Token has been expired.2"
            );
        }

        Customer customer = oldToken.getCustomer();

        // Do not allow refresh tokens for unverified or suspended accounts.
        if (customer.getStatus() == null
                || !"ACTIVE".equals(customer.getStatus().name())) {
            oldToken.revoke();
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "INVALID_REFRESH_TOKEN",
                    "Token has been expired.3"
            );
        }

        String newRawToken = generateOpaqueToken();
        String newHash = sha256(newRawToken);

        oldToken.rotate(newHash);

        RefreshToken replacement = new RefreshToken(
                customer,
                newHash,
                Instant.now().plusSeconds(REFRESH_TOKEN_LIFETIME_SECONDS),
                oldToken.getFamilyId()
        );

        refreshTokenRepository.save(oldToken);
        refreshTokenRepository.save(replacement);

        String accessToken = jwtService.createAccessToken(customer);

        return new TokenResponse(
                accessToken,
                newRawToken,
                "Bearer",
                900,
                customer.getId()
        );
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));

            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Unable to hash refresh token.", ex
            );
        }
    }

    private ApiException invalidRefreshToken() {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN",
                "Token has been expired.4"
        );
    }
}