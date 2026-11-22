package com.fintech.card.client;

import com.fintech.card.client.dto.AccountVerificationDto;
import com.fintech.card.exception.AccountNotFoundException;
import com.fintech.card.exception.AccountOwnershipMismatchException;
import com.fintech.card.exception.ExternalServiceTimeoutException;
import com.fintech.card.exception.ExternalServiceUnavailableException;
import com.fintech.card.util.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.UUID;

@Component
public class AccountServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AccountServiceClient.class);

    private final RestClient restClient;

    public AccountServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.account-service.service-id:ACCOUNT-SERVICE}") String accountServiceId) {
        String baseUrl = accountServiceId.startsWith("http://") || accountServiceId.startsWith("https://")
                ? accountServiceId
                : "http://" + accountServiceId;
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .build();
    }

    public AccountVerificationDto getAccountVerification(String accountId) {
        if (accountId == null || accountId.isBlank()) {
            throw new AccountNotFoundException("Account ID must not be blank.");
        }

        String correlationId = resolveCorrelationId();
        String bearerToken = extractBearerToken();

        log.info("Calling Account Service to verify account: correlationId={}", correlationId);

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
                        log.warn("Account Service responded with 4xx: status={}, correlationId={}", status, correlationId);
                        if (status == 404) {
                            throw new AccountNotFoundException("Account " + accountId + " was not found in Account Service.");
                        } else if (status == 403) {
                            throw new AccountOwnershipMismatchException("Access denied for account: " + accountId);
                        }
                        throw new AccountNotFoundException("Account verification failed with status: " + status);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        log.error("Account Service returned 5xx server error: status={}, correlationId={}", status, correlationId);
                        if (status == 504) {
                            throw new ExternalServiceTimeoutException("Account Service timed out while verifying account: " + accountId);
                        }
                        throw new ExternalServiceUnavailableException("Account Service failed with server error (HTTP " + status + ").");
                    })
                    .body(AccountVerificationDto.class);

        } catch (AccountNotFoundException | AccountOwnershipMismatchException | ExternalServiceTimeoutException | ExternalServiceUnavailableException e) {
            throw e;
        } catch (ResourceAccessException rae) {
            log.error("Connection or timeout error while contacting Account Service: correlationId={}, message={}", correlationId, rae.getMessage());
            if (rae.getCause() instanceof SocketTimeoutException) {
                throw new ExternalServiceTimeoutException("Account Service timed out during connection.");
            }
            throw new ExternalServiceUnavailableException("Account Service is currently unreachable.");
        } catch (Exception ex) {
            log.error("Unexpected error contacting Account Service: correlationId={}, error={}", correlationId, ex.getMessage(), ex);
            throw new ExternalServiceUnavailableException("Unable to contact Account Service for account verification.");
        }
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
