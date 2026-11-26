package com.fintech.loan.client;

import com.fintech.loan.client.dto.LedgerDtos.*;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.Optional;
import java.util.UUID;

@Component
public class LedgerServiceClient {

    private static final Logger log = LoggerFactory.getLogger(LedgerServiceClient.class);

    private final RestClient restClient;
    private final String internalSecretToken;

    public LedgerServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.ledger-service.service-id:" + LoanConstants.SERVICE_LEDGER + "}") String serviceId,
            @Value("${app.services.internal-secret-token:finbank-internal-secret-token}") String internalSecretToken) {
        String baseUrl = (serviceId.startsWith("http://") || serviceId.startsWith("https://"))
                ? serviceId
                : "http://" + serviceId;
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.internalSecretToken = internalSecretToken;
    }

    public LedgerBalanceDto getAccountBalance(String accountId) {
        String correlationId = resolveCorrelationId();
        try {
            LedgerBalanceDto balance = restClient.get()
                    .uri(LoanConstants.PATH_INTERNAL_LEDGER_BALANCE, accountId)
                    .headers(h -> applyInternalHeaders(h, correlationId, null))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new ApiException(HttpStatus.valueOf(res.getStatusCode().value()),
                                "LEDGER_BALANCE_LOOKUP_FAILED",
                                "Failed to retrieve balance from Ledger Service for account: " + accountId);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                                "Ledger Service returned HTTP " + res.getStatusCode().value());
                    })
                    .body(LedgerBalanceDto.class);
            if (balance == null) {
                throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                        "Ledger Service returned an empty balance response.");
            }
            return balance;
        } catch (ApiException ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof SocketTimeoutException) {
                throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "LEDGER_SERVICE_TIMEOUT",
                        "Ledger Service timed out while fetching account balance.");
            }
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Ledger Service is unreachable.");
        } catch (Exception ex) {
            log.error("Unexpected error fetching ledger balance for {}: {}", accountId, ex.getMessage());
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Ledger Service is unavailable.");
        }
    }

    public LedgerPostingResponseDto postBatch(String idempotencyKey, MultiLinePostingRequest request) {
        String correlationId = resolveCorrelationId();
        try {
            LedgerPostingResponseDto response = restClient.post()
                    .uri(LoanConstants.PATH_INTERNAL_LEDGER_POSTINGS_BATCH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> applyInternalHeaders(h, correlationId, idempotencyKey))
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        int code = res.getStatusCode().value();
                        if (code == 422) {
                            throw ApiException.unprocessable("INSUFFICIENT_BALANCE_OR_INELIGIBLE",
                                    "Ledger rejected posting due to insufficient balance or ineligible account.");
                        }
                        if (code == 409) {
                            throw ApiException.conflict("LEDGER_POSTING_CONFLICT",
                                    "Ledger posting conflict or duplicate idempotency key.");
                        }
                        throw new ApiException(HttpStatus.valueOf(code), "LEDGER_POSTING_FAILED",
                                "Ledger posting failed with HTTP " + code);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                                "Ledger Service returned HTTP " + res.getStatusCode().value());
                    })
                    .body(LedgerPostingResponseDto.class);

            if (response == null) {
                throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                        "Ledger Service returned an empty posting response.");
            }
            return response;
        } catch (ApiException ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof SocketTimeoutException) {
                throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "LEDGER_SERVICE_TIMEOUT",
                        "Ledger Service timed out during posting; outcome requires verification.");
            }
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Ledger Service is unreachable.");
        } catch (Exception ex) {
            log.error("Unexpected error posting ledger batch ref={}: {}", request.referenceNumber(), ex.getMessage());
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Ledger Service is unavailable.");
        }
    }

    public Optional<LedgerPostingResponseDto> getTransactionIfPresent(String transactionId) {
        if (transactionId == null || transactionId.isBlank()) {
            return Optional.empty();
        }
        String correlationId = resolveCorrelationId();
        try {
            LedgerPostingResponseDto tx = restClient.get()
                    .uri(LoanConstants.PATH_INTERNAL_LEDGER_TX, transactionId)
                    .headers(h -> applyInternalHeaders(h, correlationId, null))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        if (res.getStatusCode().value() == 404) {
                            throw ApiException.notFound("LEDGER_TX_NOT_FOUND", "Not found");
                        }
                        throw ApiException.badRequest("LEDGER_TX_LOOKUP_FAILED", "Lookup failed");
                    })
                    .body(LedgerPostingResponseDto.class);
            return Optional.ofNullable(tx);
        } catch (ApiException ex) {
            if ("LEDGER_TX_NOT_FOUND".equals(ex.getCode())) {
                return Optional.empty();
            }
            throw ex;
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE", "Unable to verify ledger transaction.");
        }
    }

    public ReversalResponseDto reverseTransaction(String transactionId, String idempotencyKey,
                                                    String reasonCode, String remarks) {
        String correlationId = resolveCorrelationId();
        try {
            ReversalResponseDto response = restClient.post()
                    .uri(LoanConstants.PATH_INTERNAL_LEDGER_REVERSE, transactionId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> applyInternalHeaders(h, correlationId, idempotencyKey))
                    .body(new ReverseTransactionRequest(reasonCode, remarks))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new ApiException(HttpStatus.valueOf(res.getStatusCode().value()),
                                "LEDGER_REVERSAL_FAILED",
                                "Ledger reversal failed for transaction: " + transactionId);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                                "Ledger Service returned HTTP " + res.getStatusCode().value());
                    })
                    .body(ReversalResponseDto.class);
            if (response == null) {
                throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                        "Ledger Service returned an empty reversal response.");
            }
            return response;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to reverse ledger tx={}: {}", transactionId, ex.getMessage());
            throw ApiException.serviceUnavailable("LEDGER_SERVICE_UNAVAILABLE",
                    "Ledger Service is unavailable for reversal.");
        }
    }

    private void applyInternalHeaders(HttpHeaders headers, String correlationId, String idempotencyKey) {
        headers.set(LoanConstants.HEADER_INTERNAL_SERVICE_SECRET, internalSecretToken);
        headers.set(LoanConstants.HEADER_CORRELATION_ID, correlationId);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            headers.set(LoanConstants.HEADER_IDEMPOTENCY_KEY, idempotencyKey);
        }
    }

    private String resolveCorrelationId() {
        String cid = MDC.get(LoanConstants.MDC_CORRELATION_ID);
        return (cid != null && !cid.isBlank()) ? cid : UUID.randomUUID().toString();
    }
}
