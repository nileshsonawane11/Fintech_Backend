package com.fintech.loan.client;

import com.fintech.loan.client.dto.InternalAccountDto;
import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.UUID;

@Component
public class AccountServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AccountServiceClient.class);

    private final RestClient restClient;
    private final int maxRetries;

    public AccountServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.account-service.service-id:" + LoanConstants.SERVICE_ACCOUNT + "}") String serviceId,
            @Value("${app.services.max-retries:2}") int maxRetries) {
        String baseUrl = (serviceId.startsWith("http://") || serviceId.startsWith("https://"))
                ? serviceId
                : "http://" + serviceId;
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.maxRetries = Math.max(0, maxRetries);
    }

    public InternalAccountDto getAccount(String accountIdentifier) {
        if (accountIdentifier == null || accountIdentifier.isBlank()) {
            throw ApiException.badRequest("DISBURSEMENT_ACCOUNT_REQUIRED",
                    "Disbursement account identifier or account number is required.");
        }

        String correlationId = resolveCorrelationId();
        String bearerToken = SecurityUtils.getBearerToken();

        int attempt = 0;
        while (true) {
            try {
                InternalAccountDto account = restClient.get()
                        .uri(LoanConstants.PATH_INTERNAL_ACCOUNT_BY_ID, accountIdentifier.trim())
                        .headers(h -> {
                            h.set(LoanConstants.HEADER_CORRELATION_ID, correlationId);
                            if (bearerToken != null && !bearerToken.isBlank()) {
                                h.setBearerAuth(bearerToken);
                            }
                        })
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                            int status = res.getStatusCode().value();
                            if (status == 404) {
                                throw ApiException.notFound("DISBURSEMENT_ACCOUNT_NOT_FOUND",
                                        "Disbursement account was not found: " + accountIdentifier);
                            }
                            if (status == 403) {
                                throw ApiException.forbidden("ACCOUNT_OWNERSHIP_MISMATCH",
                                        "Access denied for disbursement account: " + accountIdentifier);
                            }
                            throw ApiException.badRequest("ACCOUNT_LOOKUP_FAILED",
                                    "Account Service rejected verification for account: " + accountIdentifier);
                        })
                        .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                            throw ApiException.serviceUnavailable("ACCOUNT_SERVICE_UNAVAILABLE",
                                    "Account Service returned HTTP " + res.getStatusCode().value());
                        })
                        .body(InternalAccountDto.class);

                if (account == null) {
                    throw ApiException.notFound("DISBURSEMENT_ACCOUNT_NOT_FOUND",
                            "Disbursement account was not found: " + accountIdentifier);
                }
                return account;
            } catch (ApiException ex) {
                if (!ex.getHttpStatus().is5xxServerError() || attempt >= maxRetries) {
                    throw ex;
                }
                attempt++;
                log.warn("Retrying Account Service lookup (attempt {}/{})", attempt, maxRetries);
            } catch (ResourceAccessException ex) {
                if (attempt >= maxRetries) {
                    if (ex.getCause() instanceof SocketTimeoutException) {
                        throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "ACCOUNT_SERVICE_TIMEOUT",
                                "Account Service timed out while verifying disbursement account.");
                    }
                    throw ApiException.serviceUnavailable("ACCOUNT_SERVICE_UNAVAILABLE",
                            "Account Service is currently unreachable.");
                }
                attempt++;
                log.warn("Transient connection error calling Account Service (attempt {}/{}): {}",
                        attempt, maxRetries, ex.getMessage());
            } catch (Exception ex) {
                log.error("Unexpected error calling Account Service for {}: {}", accountIdentifier, ex.getMessage(), ex);
                throw ApiException.serviceUnavailable("ACCOUNT_SERVICE_UNAVAILABLE",
                        "Unable to verify disbursement account with Account Service.");
            }
        }
    }

    public InternalAccountDto validateDisbursementAccount(
            String accountIdentifier,
            String expectedIdentitySubject,
            String expectedCustomerId,
            String expectedCurrency) {

        InternalAccountDto account = getAccount(accountIdentifier);

        boolean ownerMatches = expectedIdentitySubject != null
                && account.identitySubject() != null
                && expectedIdentitySubject.equalsIgnoreCase(account.identitySubject());
        if (!ownerMatches) {
            log.warn("Disbursement account ownership mismatch: accountId={}, expectedSubject={}",
                    account.accountId(), expectedIdentitySubject);
            throw ApiException.forbidden("ACCOUNT_OWNERSHIP_MISMATCH",
                    "The specified disbursement account does not belong to the authenticated customer.");
        }

        if (expectedCustomerId != null && account.customerId() != null
                && !expectedCustomerId.equalsIgnoreCase(account.customerId())) {
            throw ApiException.forbidden("ACCOUNT_OWNERSHIP_MISMATCH",
                    "Disbursement account customer ownership verification failed.");
        }

        if (account.status() == null || !LoanConstants.ACCOUNT_STATUS_ACTIVE.equalsIgnoreCase(account.status())) {
            throw ApiException.unprocessable("ACCOUNT_NOT_ACTIVE",
                    "Disbursement account must be ACTIVE. Current status: " + account.status());
        }

        String type = account.accountType() != null ? account.accountType().trim().toUpperCase() : "";
        if (!LoanConstants.DISBURSEMENT_ELIGIBLE_ACCOUNT_TYPES.contains(type)) {
            throw ApiException.unprocessable("ACCOUNT_NOT_ELIGIBLE_FOR_DISBURSEMENT",
                    "Account type '" + type + "' is not eligible for loan disbursement. Eligible types: "
                            + LoanConstants.DISBURSEMENT_ELIGIBLE_ACCOUNT_TYPES);
        }

        if (expectedCurrency != null && account.currency() != null
                && !expectedCurrency.equalsIgnoreCase(account.currency())) {
            throw ApiException.unprocessable("CURRENCY_MISMATCH",
                    "Account currency (" + account.currency() + ") does not match loan currency (" + expectedCurrency + ").");
        }

        return account;
    }

    private String resolveCorrelationId() {
        String id = MDC.get(LoanConstants.MDC_CORRELATION_ID);
        return (id != null && !id.isBlank()) ? id : UUID.randomUUID().toString();
    }
}
