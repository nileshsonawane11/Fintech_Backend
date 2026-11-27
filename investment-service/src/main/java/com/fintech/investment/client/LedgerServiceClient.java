package com.fintech.investment.client;

import com.fintech.investment.client.dto.ExternalDtos.*;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.exception.ApiException;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.UUID;

@Component
public class LedgerServiceClient {

    private final RestClient restClient;
    private final String internalSecretToken;

    public LedgerServiceClient(
            @Qualifier("loadBalancedRestClientBuilder") RestClient.Builder builder,
            @Value("${app.services.ledger-service.service-id:LEDGER-TRANSACTION-SERVICE}") String serviceId,
            @Value("${app.services.internal-secret-token:finbank-internal-secret-token}") String internalSecretToken) {
        String baseUrl = serviceId.startsWith("http") ? serviceId : "http://" + serviceId;
        this.restClient = builder.baseUrl(baseUrl).build();
        this.internalSecretToken = internalSecretToken;
    }

    public LedgerBalanceDto getAccountBalance(String accountId) {
        String correlationId = resolveCorrelationId();
        try {
            LedgerBalanceDto balance = restClient.get()
                    .uri(InvestmentConstants.PATH_INTERNAL_LEDGER_BALANCE, accountId)
                    .headers(h -> applyHeaders(h, correlationId, null))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new ApiException(HttpStatus.valueOf(res.getStatusCode().value()),
                                "LEDGER_BALANCE_ERROR", "Failed to fetch balance for account " + accountId);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                                "Ledger Service returned HTTP " + res.getStatusCode().value());
                    })
                    .body(LedgerBalanceDto.class);
            if (balance == null) {
                throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Empty balance response from Ledger.");
            }
            return balance;
        } catch (ApiException ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof SocketTimeoutException) {
                throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "LEDGER_TIMEOUT", "Ledger balance check timed out.");
            }
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Ledger Service unreachable.");
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Ledger Service error: " + ex.getMessage());
        }
    }

    public LedgerPostingResponseDto postBatch(String idempotencyKey, MultiLinePostingRequest request) {
        String correlationId = resolveCorrelationId();
        try {
            LedgerPostingResponseDto response = restClient.post()
                    .uri(InvestmentConstants.PATH_INTERNAL_LEDGER_POSTINGS_BATCH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> applyHeaders(h, correlationId, idempotencyKey))
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        int code = res.getStatusCode().value();
                        String errBody = "";
                        try {
                            errBody = new String(res.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                        } catch (Exception ignored) {}
                        if (code == 422) {
                            throw ApiException.unprocessable("INSUFFICIENT_BALANCE",
                                    "Insufficient available balance or ineligible account in Ledger. " + errBody);
                        }
                        if (code == 409) {
                            throw ApiException.conflict("LEDGER_CONFLICT",
                                    "Duplicate idempotency key or posting conflict in Ledger. " + errBody);
                        }
                        throw new ApiException(HttpStatus.valueOf(code), "LEDGER_POSTING_FAILED",
                                "Ledger posting failed with HTTP " + code + (errBody.isBlank() ? "" : ": " + errBody));
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                                "Ledger Service returned HTTP " + res.getStatusCode().value());
                    })
                    .body(LedgerPostingResponseDto.class);
            if (response == null) {
                throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Empty posting response from Ledger.");
            }
            return response;
        } catch (ApiException ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof SocketTimeoutException) {
                throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "LEDGER_TIMEOUT",
                        "Ledger posting timed out; reconciliation required.");
            }
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Ledger Service unreachable.");
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Ledger Service error: " + ex.getMessage());
        }
    }

    private void applyHeaders(HttpHeaders headers, String correlationId, String idempotencyKey) {
        headers.set(InvestmentConstants.HEADER_INTERNAL_SECRET, internalSecretToken);
        headers.set(InvestmentConstants.HEADER_CORRELATION_ID, correlationId);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            headers.set(InvestmentConstants.HEADER_IDEMPOTENCY_KEY, idempotencyKey);
        }
    }

    private String resolveCorrelationId() {
        String cid = MDC.get(InvestmentConstants.MDC_CORRELATION_ID);
        return (cid != null && !cid.isBlank()) ? cid : UUID.randomUUID().toString();
    }
}
