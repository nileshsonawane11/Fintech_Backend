package com.fintech.ledger.client;

import com.fintech.ledger.dto.response.CursorPagedResponse;
import com.fintech.ledger.exception.LedgerException;
import com.fintech.ledger.util.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
public class AccountServiceClientImpl implements AccountServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AccountServiceClientImpl.class);

    private final RestClient restClient;
    private final boolean mockEnabled;

    @Autowired
    public AccountServiceClientImpl(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.account-service.service-id:ACCOUNT-SERVICE}")
            String accountServiceIdentifier,
            @Value("${app.services.account-service.mock-enabled:false}")
            boolean mockEnabled) {

        String baseUrl = accountServiceIdentifier.startsWith("http://") || accountServiceIdentifier.startsWith("https://")
                ? accountServiceIdentifier
                : "http://" + accountServiceIdentifier;

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .build();

        this.mockEnabled = mockEnabled;
    }

    public AccountServiceClientImpl(RestClient restClient) {
        this.restClient = restClient;
        this.mockEnabled = false;
    }

    @Override
    public AccountDetailsDto getAccount(String accountId) {
        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("INVALID_ACCOUNT_ID", "Account ID must not be blank.");
        }

        String correlationId = resolveCorrelationId();
        String bearerToken = extractBearerToken();

        log.debug("Calling Account Service to retrieve account details: accountId={}, correlationId={}", accountId, correlationId);

        try {
            return restClient.get()
                    .uri("/internal/api/v1/accounts/{accountId}", accountId)
                    .header(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId)
                    .headers(headers -> {
                        if (bearerToken != null) {
                            headers.setBearerAuth(bearerToken);
                        }
                    })
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        log.warn("Account Service responded with 4xx: status={}, accountId={}, correlationId={}", status, accountId, correlationId);
                        if (status == 404) {
                            throw LedgerException.accountNotFound("Account " + accountId + " was not found in Account Service.");
                        } else if (status == 403) {
                            throw LedgerException.accountOwnershipMismatch("Access denied for account: " + accountId);
                        }
                        throw LedgerException.badRequest("ACCOUNT_SERVICE_CLIENT_ERROR", "Account verification failed with status: " + status);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        log.error("Account Service returned 5xx server error: status={}, accountId={}, correlationId={}", status, accountId, correlationId);
                        throw LedgerException.serviceUnavailable("Account Service failed with server error (HTTP " + status + ").");
                    })
                    .body(AccountDetailsDto.class);

        } catch (LedgerException le) {
            throw le;
        } catch (ResourceAccessException rae) {
            log.error(
                    "Account Service connection/timeout failure: accountId={}, correlationId={}, error={}",
                    accountId,
                    correlationId,
                    rae.getMessage(),
                    rae
            );

            if (rae.getCause() instanceof SocketTimeoutException) {
                throw LedgerException.serviceUnavailable(
                        "Account Service timed out while verifying account."
                );
            }

            throw LedgerException.serviceUnavailable(
                    "Account Service is currently unreachable."
            );
        } catch (Exception ex) {
            log.error(
                    "Unexpected error contacting Account Service: accountId={}, correlationId={}, error={}",
                    accountId,
                    correlationId,
                    ex.getMessage(),
                    ex
            );

            throw LedgerException.serviceUnavailable(
                    "Unable to contact Account Service for account verification."
            );
        }
    }

    @Override
    public Optional<AccountDetailsDto> findAccount(String accountId) {
        try {
            return Optional.ofNullable(getAccount(accountId));
        } catch (LedgerException ex) {
            if ("ACCOUNT_NOT_FOUND".equals(ex.getErrorCode())) {
                return Optional.empty();
            }
            throw ex;
        }
    }

    @Override
    public AccountDetailsDto validateAccountEligible(String accountId, String expectedCurrency) {
        AccountDetailsDto account = getAccount(accountId);
        if (!account.isActive()) {
            throw LedgerException.inactiveAccount("Account " + accountId + " is not active (current status: " + account.status() + ").");
        }
        if (expectedCurrency != null && !expectedCurrency.isBlank() && account.currency() != null) {
            if (!account.currency().equalsIgnoreCase(expectedCurrency)) {
                throw LedgerException.currencyMismatch(
                        String.format("Account %s currency (%s) does not match required currency (%s).",
                                accountId, account.currency(), expectedCurrency));
            }
        }
        return account;
    }

    @Override
    public void validateCustomerOwnership(String accountId, String identitySubject) {
        if (identitySubject == null || identitySubject.isBlank()) {
            throw LedgerException.unauthorized("Authentication required: missing identity subject");
        }

        AccountDetailsDto account = getAccount(accountId);

        // Ownership validation MUST strictly compare JWT identity_subject with Account's identitySubject
        if (account.identitySubject() != null && !account.identitySubject().equalsIgnoreCase(identitySubject)) {
            log.warn("Customer ownership mismatch: account={}, accountIdentitySubject={}, jwtIdentitySubject={}",
                    accountId, account.identitySubject(), identitySubject);
            throw LedgerException.accountOwnershipMismatch("Access denied: You do not own account " + accountId);
        }
    }

    @Override
    public boolean verifyAccountOwnership(String accountId, String identitySubject) {
        try {
            validateCustomerOwnership(accountId, identitySubject);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public boolean isAccountEligibleForTransfers(String accountId) {
        try {
            AccountDetailsDto account = getAccount(accountId);
            return account.isActive();
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public List<AccountHoldDto> getAccountHolds(String accountId, String status) {
        if (accountId == null || accountId.isBlank()) {
            throw LedgerException.badRequest("INVALID_ACCOUNT_ID", "Account ID must not be blank.");
        }

        String correlationId = resolveCorrelationId();
        String bearerToken = extractBearerToken();

        log.debug("Calling Account Service to retrieve holds: accountId={}, status={}, correlationId={}",
                accountId, status, correlationId);

        List<AccountHoldDto> allHolds = new ArrayList<>();
        String cursor = null;
        boolean hasMore = true;

        try {
            while (hasMore) {
                final String currentCursor = cursor;
                ParameterizedTypeReference<CursorPagedResponse<AccountHoldDto>> responseType =
                        new ParameterizedTypeReference<>() {};

                CursorPagedResponse<AccountHoldDto> pagedResponse = restClient.get()
                        .uri(uriBuilder -> {
                            var builder = uriBuilder.path("/internal/api/v1/accounts/{accountId}/holds")
                                    .queryParam("limit", 100);
                            if (status != null && !status.isBlank()) {
                                builder.queryParam("status", status);
                            }
                            if (currentCursor != null && !currentCursor.isBlank()) {
                                builder.queryParam("cursor", currentCursor);
                            }
                            return builder.build(accountId);
                        })
                        .header(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId)
                        .headers(headers -> {
                            if (bearerToken != null) {
                                headers.setBearerAuth(bearerToken);
                            }
                        })
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                            int statusCode = res.getStatusCode().value();
                            log.warn("Account Service responded with 4xx while retrieving holds: status={}, accountId={}, correlationId={}",
                                    statusCode, accountId, correlationId);
                            if (statusCode == 404) {
                                throw LedgerException.accountNotFound("Account " + accountId + " was not found in Account Service.");
                            } else if (statusCode == 403) {
                                throw LedgerException.accountOwnershipMismatch("Access denied for account: " + accountId);
                            }
                            throw LedgerException.badRequest("ACCOUNT_SERVICE_CLIENT_ERROR",
                                    "Account hold retrieval failed with status: " + statusCode);
                        })
                        .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                            int statusCode = res.getStatusCode().value();
                            log.error("Account Service returned 5xx server error while retrieving holds: status={}, accountId={}, correlationId={}",
                                    statusCode, accountId, correlationId);
                            throw LedgerException.serviceUnavailable("Account Service failed with server error (HTTP " + statusCode + ").");
                        })
                        .body(responseType);

                if (pagedResponse == null || pagedResponse.data() == null) {
                    throw LedgerException.serviceUnavailable("Invalid response received from Account Service for account holds.");
                }

                allHolds.addAll(pagedResponse.data());

                if (pagedResponse.pagination() != null && pagedResponse.pagination().hasMore()
                        && pagedResponse.pagination().nextCursor() != null
                        && !pagedResponse.pagination().nextCursor().isBlank()) {
                    cursor = pagedResponse.pagination().nextCursor();
                } else {
                    hasMore = false;
                }
            }

            return allHolds;

        } catch (LedgerException le) {
            throw le;
        } catch (ResourceAccessException rae) {
            log.error(
                    "Account Service connection/timeout failure while retrieving holds: accountId={}, correlationId={}, error={}",
                    accountId,
                    correlationId,
                    rae.getMessage(),
                    rae
            );

            if (rae.getCause() instanceof SocketTimeoutException) {
                throw LedgerException.serviceUnavailable(
                        "Account Service timed out while retrieving holds for account: " + accountId
                );
            }

            throw LedgerException.serviceUnavailable(
                    "Account Service is currently unreachable."
            );
        } catch (Exception ex) {
            log.error(
                    "Unexpected error contacting Account Service for holds: accountId={}, correlationId={}, error={}",
                    accountId,
                    correlationId,
                    ex.getMessage(),
                    ex
            );

            throw LedgerException.serviceUnavailable(
                    "Unable to contact Account Service for account hold retrieval."
            );
        }
    }

    @Override
    public BigDecimal getActiveHoldAmount(String accountId) {
        List<AccountHoldDto> activeHolds = getAccountHolds(accountId, "ACTIVE");

        return activeHolds.stream()
                .filter(AccountHoldDto::isActive)
                .map(AccountHoldDto::amount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private AccountDetailsDto createMockAccount(String accountId) {
        return new AccountDetailsDto(
                UUID.randomUUID(),
                accountId,
                "************1001",
                "CUS-1001",
                "usr-12345678",
                UUID.randomUUID(),
                "SAV-STD",
                "SAVINGS",
                "INR",
                "ACTIVE",
                Instant.now()
        );
    }

    private String extractBearerToken() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getTokenValue();
        }
        return null;
    }

    private String resolveCorrelationId() {
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
        return (correlationId != null && !correlationId.isBlank()) ? correlationId : UUID.randomUUID().toString();
    }
}
