package com.fintech.payment.client;

import com.fintech.payment.client.dto.AccountHoldPageDto;
import com.fintech.payment.client.dto.InternalAccountDto;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;

@Component
public class AccountServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AccountServiceClient.class);

    private final RestClient restClient;

    public AccountServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.account-service.service-id:" + PaymentConstants.SERVICE_ACCOUNT + "}") String serviceId) {
        this.restClient = restClientBuilder
                .baseUrl("http://" + serviceId)
                .build();
    }

    public InternalAccountDto getAccount(String accountId) {
        String correlationId = MDC.get(PaymentConstants.MDC_CORRELATION_ID);
        try {
            InternalAccountDto account = restClient.get()
                    .uri(PaymentConstants.PATH_INTERNAL_ACCOUNT_BY_ID, accountId)
                    .headers(headers -> {
                        if (correlationId != null) {
                            headers.set(PaymentConstants.HEADER_CORRELATION_ID, correlationId);
                        }
                    })
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        if (res.getStatusCode().value() == 404) {
                            throw new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND",
                                    "FinBank account not found: " + accountId);
                        }
                        throw new ApiException(HttpStatus.BAD_REQUEST, "ACCOUNT_LOOKUP_FAILED",
                                "Account Service rejected lookup for account: " + accountId);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ACCOUNT_SERVICE_UNAVAILABLE",
                                "Account Service returned an error");
                    })
                    .body(InternalAccountDto.class);

            if (account == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", "Account not found: " + accountId);
            }
            return account;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Account Service unreachable while fetching accountId={}: {}", accountId, ex.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ACCOUNT_SERVICE_UNAVAILABLE",
                    "Account Service is currently unavailable");
        }
    }

    public InternalAccountDto validateCustomerAccountEligible(
            String accountId, String expectedIdentitySubject, String expectedCurrency) {
        InternalAccountDto account = getAccount(accountId);

        if (expectedIdentitySubject == null || !expectedIdentitySubject.equals(account.identitySubject())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_OWNERSHIP_MISMATCH",
                    "You do not own account: " + accountId);
        }

        if (!PaymentConstants.ACCOUNT_STATUS_ACTIVE.equalsIgnoreCase(account.status())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ACCOUNT_NOT_ACTIVE",
                    "Account is not eligible for payment operations. Current status: " + account.status());
        }
        if (expectedCurrency != null && !expectedCurrency.equalsIgnoreCase(account.currency())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CURRENCY_MISMATCH",
                    "Account currency " + account.currency() + " does not match " + expectedCurrency);
        }
        return account;
    }

    public BigDecimal getTotalActiveHolds(String accountId) {
        String correlationId = MDC.get(PaymentConstants.MDC_CORRELATION_ID);
        BigDecimal total = BigDecimal.ZERO;
        String cursor = null;

        try {
            do {
                final String currentCursor = cursor;
                AccountHoldPageDto page = restClient.get()
                        .uri(uriBuilder -> {
                            uriBuilder.path(PaymentConstants.PATH_INTERNAL_ACCOUNT_HOLDS)
                                    .queryParam("status", "ACTIVE")
                                    .queryParam("limit", PaymentConstants.MAX_PAGE_SIZE);
                            if (currentCursor != null) {
                                uriBuilder.queryParam("cursor", currentCursor);
                            }
                            return uriBuilder.build(accountId);
                        })
                        .headers(headers -> {
                            if (correlationId != null) {
                                headers.set(PaymentConstants.HEADER_CORRELATION_ID, correlationId);
                            }
                        })
                        .retrieve()
                        .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "ACCOUNT_HOLD_CHECK_FAILED",
                                    "Could not verify holds on account: " + accountId);
                        })
                        .body(AccountHoldPageDto.class);

                if (page == null) {
                    break;
                }
                List<AccountHoldPageDto.AccountHoldDto> items = page.items();
                if (items != null) {
                    for (AccountHoldPageDto.AccountHoldDto hold : items) {
                        if ("ACTIVE".equalsIgnoreCase(hold.status()) && hold.amount() != null) {
                            total = total.add(hold.amount());
                        }
                    }
                }
                cursor = page.hasMore() ? page.nextCursor() : null;
            } while (cursor != null && !cursor.isBlank());
            return total;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Account Service unreachable while checking holds for accountId={}: {}", accountId, ex.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ACCOUNT_SERVICE_UNAVAILABLE",
                    "Account Service is currently unavailable for hold verification");
        }
    }
}
