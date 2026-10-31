package com.fintech.identity.service;

import com.fintech.identity.dto.response.TokenResponse;
import com.fintech.identity.exception.ApiException;
import com.fintech.identity.model.Customer;
import com.fintech.identity.model.RefreshToken;
import com.fintech.identity.repository.CustomerRepository;
import com.fintech.identity.repository.RefreshTokenRepository;
import com.fintech.identity.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class RefreshTokenServiceTest {

    private RefreshTokenRepository refreshTokenRepository;
    private CustomerRepository customerRepository;
    private JwtService jwtService;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        customerRepository = mock(CustomerRepository.class);
        jwtService = mock(JwtService.class);

        refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                customerRepository,
                jwtService
        );
    }

    @Test
    @DisplayName("Refresh token rotation issues new access token and new refresh token")
    void testRefreshTokenRotation() {
        Customer customer = new Customer(
                "9876543210",
                "test@example.com",
                "hashed",
                "V1",
                true
        );
        customer.activate();

        RefreshToken oldToken = new RefreshToken(
                customer,
                "some-hash",
                Instant.now().plusSeconds(3600),
                UUID.randomUUID()
        );

        when(refreshTokenRepository.findByTokenHashForUpdate(anyString()))
                .thenReturn(Optional.of(oldToken));

        when(jwtService.createAccessToken(customer))
                .thenReturn("new-access-token-with-roles");

        TokenResponse response = refreshTokenService.rotate("raw-refresh-token");

        assertNotNull(response);
        assertEquals("new-access-token-with-roles", response.accessToken());
        assertNotNull(response.refreshToken());
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Reusing a revoked refresh token revokes whole family and throws 401")
    void testReusingRevokedRefreshTokenThrows401() {
        Customer customer = new Customer(
                "9876543210",
                "test@example.com",
                "hashed",
                "V1",
                true
        );
        customer.activate();

        UUID familyId = UUID.randomUUID();
        RefreshToken revokedToken = new RefreshToken(
                customer,
                "some-hash",
                Instant.now().plusSeconds(3600),
                familyId
        );
        revokedToken.revoke();

        when(refreshTokenRepository.findByTokenHashForUpdate(anyString()))
                .thenReturn(Optional.of(revokedToken));

        RefreshToken otherTokenInFamily = new RefreshToken(
                customer,
                "hash2",
                Instant.now().plusSeconds(3600),
                familyId
        );
        when(refreshTokenRepository.findAllByFamilyId(familyId))
                .thenReturn(List.of(revokedToken, otherTokenInFamily));

        ApiException ex = assertThrows(ApiException.class, () ->
                refreshTokenService.rotate("reused-token")
        );

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertTrue(otherTokenInFamily.isRevoked());
    }
}
