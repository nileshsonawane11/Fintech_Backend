package com.fintech.loan.client;

import com.fintech.loan.client.dto.PaymentDtos.*;
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
import java.util.UUID;

@Component
public class PaymentServiceClient {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceClient.class);

    private final RestClient restClient;
    private final String internalSecretToken;

    public PaymentServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.payment-service.service-id:" + LoanConstants.SERVICE_PAYMENT + "}") String serviceId,
            @Value("${app.services.internal-secret-token:finbank-internal-secret-token}") String internalSecretToken) {
        String baseUrl = (serviceId.startsWith("http://") || serviceId.startsWith("https://"))
                ? serviceId
                : "http://" + serviceId;
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.internalSecretToken = internalSecretToken;
    }

    public CollectionOrderResponse initiateCollection(String idempotencyKey, InitiateCollectionRequest request) {
        String correlationId = resolveCorrelationId();
        try {
            CollectionOrderResponse response = restClient.post()
                    .uri(LoanConstants.PATH_INTERNAL_PAYMENT_COLLECTIONS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> applyInternalHeaders(h, correlationId, idempotencyKey))
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new ApiException(HttpStatus.valueOf(res.getStatusCode().value()),
                                "PAYMENT_COLLECTION_REJECTED",
                                "Payment Service rejected collection request with HTTP " + res.getStatusCode().value());
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE",
                                "Payment Service returned HTTP " + res.getStatusCode().value());
                    })
                    .body(CollectionOrderResponse.class);

            if (response == null) {
                throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE",
                        "Payment Service returned an empty collection response.");
            }
            return response;
        } catch (ApiException ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            if (ex.getCause() instanceof SocketTimeoutException) {
                throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PAYMENT_SERVICE_TIMEOUT",
                        "Payment Service timed out while initiating collection.");
            }
            throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Payment Service is unreachable.");
        } catch (Exception ex) {
            log.error("Payment Service error initiating collection ref={}: {}", request.businessReference(), ex.getMessage());
            throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Payment Service is unavailable.");
        }
    }

    public CollectionOrderResponse getCollectionStatus(String collectionReference) {
        String correlationId = resolveCorrelationId();
        try {
            CollectionOrderResponse response = restClient.get()
                    .uri(LoanConstants.PATH_INTERNAL_PAYMENT_COLLECTION_STATUS, collectionReference)
                    .headers(h -> applyInternalHeaders(h, correlationId, null))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new ApiException(HttpStatus.valueOf(res.getStatusCode().value()),
                                "PAYMENT_STATUS_LOOKUP_FAILED",
                                "Payment status lookup failed for reference: " + collectionReference);
                    })
                    .body(CollectionOrderResponse.class);
            if (response == null) {
                throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Empty status response.");
            }
            return response;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Payment Service is unavailable.");
        }
    }

    public CollectionOrderResponse refundCollection(String collectionReference, String reason) {
        String correlationId = resolveCorrelationId();
        try {
            return restClient.post()
                    .uri(LoanConstants.PATH_INTERNAL_PAYMENT_COLLECTION_REFUND, collectionReference)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> applyInternalHeaders(h, correlationId, null))
                    .body(new RefundCollectionRequest(reason))
                    .retrieve()
                    .body(CollectionOrderResponse.class);
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Payment refund failed: " + ex.getMessage());
        }
    }

    public MandateRegistrationResponse registerMandate(String idempotencyKey, RegisterMandateRequest request) {
        String correlationId = resolveCorrelationId();
        try {
            MandateRegistrationResponse response = restClient.post()
                    .uri(LoanConstants.PATH_INTERNAL_PAYMENT_MANDATES)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> applyInternalHeaders(h, correlationId, idempotencyKey))
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new ApiException(HttpStatus.valueOf(res.getStatusCode().value()),
                                "MANDATE_REGISTRATION_REJECTED",
                                "Payment Service rejected mandate registration.");
                    })
                    .body(MandateRegistrationResponse.class);
            if (response == null) {
                throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Empty mandate response.");
            }
            return response;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Payment Service is unavailable.");
        }
    }

    public MandateRegistrationResponse performMandateAction(String providerReference, String action) {
        String correlationId = resolveCorrelationId();
        try {
            return restClient.post()
                    .uri(LoanConstants.PATH_INTERNAL_PAYMENT_MANDATE_ACTION, providerReference, action)
                    .headers(h -> applyInternalHeaders(h, correlationId, null))
                    .retrieve()
                    .body(MandateRegistrationResponse.class);
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Mandate action failed: " + ex.getMessage());
        }
    }

    public MandateRegistrationResponse getMandateStatus(String providerReference) {
        String correlationId = resolveCorrelationId();
        try {
            return restClient.get()
                    .uri(LoanConstants.PATH_INTERNAL_PAYMENT_MANDATE_STATUS, providerReference)
                    .headers(h -> applyInternalHeaders(h, correlationId, null))
                    .retrieve()
                    .body(MandateRegistrationResponse.class);
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("PAYMENT_SERVICE_UNAVAILABLE", "Mandate status lookup failed.");
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
