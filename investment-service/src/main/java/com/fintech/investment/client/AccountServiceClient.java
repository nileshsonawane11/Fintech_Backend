package com.fintech.investment.client;

import com.fintech.investment.client.dto.ExternalDtos.InternalAccountDto;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.exception.ApiException;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class AccountServiceClient {

    private final RestClient restClient;

    public AccountServiceClient(
            @Qualifier("loadBalancedRestClientBuilder") RestClient.Builder builder,
            @Value("${app.services.account-service.service-id:ACCOUNT-SERVICE}") String serviceId) {
        String baseUrl = serviceId.startsWith("http") ? serviceId : "http://" + serviceId;
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public InternalAccountDto validateActiveOwnedAccount(String accountId, String expectedIdentitySubject) {
        String correlationId = resolveCorrelationId();
        InternalAccountDto account;
        try {
            account = restClient.get()
                    .uri(InvestmentConstants.PATH_INTERNAL_ACCOUNT, accountId)
                    .header(InvestmentConstants.HEADER_CORRELATION_ID, correlationId)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw ApiException.notFound("ACCOUNT_NOT_FOUND", "Funding account not found: " + accountId);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("ACCOUNT_SERVICE_UNAVAILABLE",
                                "Account Service returned HTTP " + res.getStatusCode().value());
                    })
                    .body(InternalAccountDto.class);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("ACCOUNT_SERVICE_UNAVAILABLE",
                    "Account Service unreachable: " + ex.getMessage());
        }

        if (account == null) {
            throw ApiException.notFound("ACCOUNT_NOT_FOUND", "Funding account not found: " + accountId);
        }
        if (expectedIdentitySubject != null && !expectedIdentitySubject.equals(account.identitySubject())) {
            throw ApiException.forbidden("ACCOUNT_OWNERSHIP_MISMATCH",
                    "Funding account does not belong to the authenticated customer.");
        }
        if (!"ACTIVE".equalsIgnoreCase(account.status())) {
            throw ApiException.unprocessable("ACCOUNT_NOT_ACTIVE",
                    "Funding account is not ACTIVE (current status: " + account.status() + ").");
        }
        return account;
    }

    private String resolveCorrelationId() {
        String cid = MDC.get(InvestmentConstants.MDC_CORRELATION_ID);
        return (cid != null && !cid.isBlank()) ? cid : UUID.randomUUID().toString();
    }
}
