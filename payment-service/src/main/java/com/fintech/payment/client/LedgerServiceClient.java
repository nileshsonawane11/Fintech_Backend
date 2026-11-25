package com.fintech.payment.client;

import com.fintech.payment.client.dto.LedgerBalanceDto;
import com.fintech.payment.client.dto.LedgerDtos.LedgerPostingResponseDto;
import com.fintech.payment.client.dto.LedgerDtos.MultiLinePostingRequest;
import com.fintech.payment.client.dto.LedgerDtos.ReversalResponseDto;
import com.fintech.payment.client.dto.LedgerDtos.ReverseTransactionRequest;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class LedgerServiceClient {

    private static final Logger log = LoggerFactory.getLogger(LedgerServiceClient.class);

    private final RestClient restClient;
    private final String internalSecretToken;

    public LedgerServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.ledger-service.service-id:" + PaymentConstants.SERVICE_LEDGER + "}") String serviceId,
            @Value("${app.services.internal-secret-token:finbank-internal-secret-token}") String internalSecretToken) {
        this.restClient = restClientBuilder
                .baseUrl("http://" + serviceId)
                .build();
        this.internalSecretToken = internalSecretToken;
    }

    public LedgerBalanceDto getAccountBalance(String accountId) {
        String correlationId = MDC.get(PaymentConstants.MDC_CORRELATION_ID);
        try {
            LedgerBalanceDto balance = restClient.get()
                    .uri(PaymentConstants.PATH_INTERNAL_LEDGER_BALANCE, accountId)
                    .headers(headers -> applyInternalHeaders(headers, correlationId, null))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new ApiException(HttpStatus.valueOf(res.getStatusCode().value()),
                                "LEDGER_BALANCE_LOOKUP_FAILED",
                                "Failed to retrieve ledger balance for account: " + accountId);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                                "Ledger Service returned an internal error");
                    })
                    .body(LedgerBalanceDto.class);

            if (balance == null) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                        "Ledger Service returned empty balance response");
            }
            return balance;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to fetch ledger balance for accountId={}: {}", accountId, ex.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                    "Ledger Service is currently unavailable");
        }
    }

    public LedgerPostingResponseDto postBatch(String idempotencyKey, MultiLinePostingRequest request) {
        String correlationId = MDC.get(PaymentConstants.MDC_CORRELATION_ID);
        try {
            LedgerPostingResponseDto response = restClient.post()
                    .uri(PaymentConstants.PATH_INTERNAL_LEDGER_POSTINGS_BATCH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> applyInternalHeaders(headers, correlationId, idempotencyKey))
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        if (status == 422) {
                            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "LEDGER_POSTING_REJECTED",
                                    "Ledger rejected posting (insufficient balance or ineligible account)");
                        }
                        if (status == 409) {
                            throw new ApiException(HttpStatus.CONFLICT, "LEDGER_POSTING_CONFLICT",
                                    "Ledger posting conflict or duplicate idempotency key");
                        }
                        throw new ApiException(HttpStatus.valueOf(status), "LEDGER_POSTING_FAILED",
                                "Ledger posting failed with status " + status);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                                "Ledger Service returned an error while posting");
                    })
                    .body(LedgerPostingResponseDto.class);

            if (response == null) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                        "Ledger Service returned empty posting response");
            }
            return response;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to post ledger batch reference={}: {}", request.referenceNumber(), ex.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                    "Ledger Service is currently unavailable");
        }
    }

    public ReversalResponseDto reverseTransaction(
            String transactionId, String idempotencyKey, String reasonCode, String remarks) {
        String correlationId = MDC.get(PaymentConstants.MDC_CORRELATION_ID);
        try {
            ReversalResponseDto response = restClient.post()
                    .uri(PaymentConstants.PATH_INTERNAL_LEDGER_REVERSE, transactionId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> applyInternalHeaders(headers, correlationId, idempotencyKey))
                    .body(new ReverseTransactionRequest(reasonCode, remarks))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        throw new ApiException(HttpStatus.valueOf(status), "LEDGER_REVERSAL_FAILED",
                                "Ledger reversal failed for transaction " + transactionId);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                                "Ledger Service returned an error during reversal");
                    })
                    .body(ReversalResponseDto.class);

            if (response == null) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                        "Ledger Service returned empty reversal response");
            }
            return response;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to reverse ledger transaction={}: {}", transactionId, ex.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "LEDGER_SERVICE_UNAVAILABLE",
                    "Ledger Service is currently unavailable for reversal");
        }
    }

    private void applyInternalHeaders(org.springframework.http.HttpHeaders headers,
                                      String correlationId,
                                      String idempotencyKey) {
        headers.set(PaymentConstants.HEADER_INTERNAL_SERVICE_SECRET, internalSecretToken);
        if (correlationId != null && !correlationId.isBlank()) {
            headers.set(PaymentConstants.HEADER_CORRELATION_ID, correlationId);
        }
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            headers.set(PaymentConstants.HEADER_IDEMPOTENCY_KEY, idempotencyKey);
        }
    }
}
