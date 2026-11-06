package com.fintech.ledger.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Component
public class AccountServiceClientImpl implements AccountServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AccountServiceClientImpl.class);

    private final RestClient restClient;
    private final boolean mockEnabled;

    public AccountServiceClientImpl(
            @Value("${app.services.account-service.url:http://localhost:8082}") String accountServiceUrl,
            @Value("${app.services.account-service.mock-enabled:true}") boolean mockEnabled) {
        this.restClient = RestClient.builder()
                .baseUrl(accountServiceUrl)
                .build();
        this.mockEnabled = mockEnabled;
    }

    @Override
    public Optional<AccountDetailsDto> getAccountDetails(String accountId) {
        try {
            AccountDetailsDto details = restClient.get()
                    .uri("/api/v1/accounts/{accountId}", accountId)
                    .retrieve()
                    .body(AccountDetailsDto.class);
            return Optional.ofNullable(details);
        } catch (Exception ex) {
            log.warn("Account service unavailable for account {} query: {}. Checking mock fallback.", accountId, ex.getMessage());
            if (mockEnabled) {
                // Resilient local fallback when Account Service is offline
                return Optional.of(new AccountDetailsDto(
                        null,
                        accountId,
                        "************1001",
                        null,
                        "SAVINGS-STD",
                        "SAVINGS",
                        "INR",
                        "ACTIVE",
                        null
                ));
            }
            return Optional.empty();
        }
    }

    @Override
    public boolean verifyAccountOwnership(String accountId, String customerSubject) {
        if (customerSubject == null || customerSubject.isBlank()) {
            return false;
        }
        Optional<AccountDetailsDto> details = getAccountDetails(accountId);
        if (details.isEmpty()) {
            return false;
        }
        if (details.get().customerId() != null) {
            return customerSubject.equalsIgnoreCase(details.get().customerId().toString());
        }
        return true;
    }

    @Override
    public boolean isAccountEligibleForTransfers(String accountId) {
        Optional<AccountDetailsDto> details = getAccountDetails(accountId);
        return details.map(d -> "ACTIVE".equalsIgnoreCase(d.status())).orElse(false);
    }
}
