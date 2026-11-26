package com.fintech.loan.client;

import com.fintech.loan.client.dto.CustomerKycContext;
import com.fintech.loan.client.dto.CustomerProfileDto;
import com.fintech.loan.client.dto.KycApplicationDto;
import com.fintech.loan.client.dto.KycDocumentDto;
import com.fintech.loan.config.SecurityUtils;
import com.fintech.loan.constants.LoanConstants;
import com.fintech.loan.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

@Component
public class CustomerServiceClient {

    private static final Logger log = LoggerFactory.getLogger(CustomerServiceClient.class);

    private final RestClient restClient;
    private final int maxRetries;

    public CustomerServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.customer-service.service-id:" + LoanConstants.SERVICE_CUSTOMER + "}") String serviceId,
            @Value("${app.services.max-retries:2}") int maxRetries) {
        String baseUrl = (serviceId.startsWith("http://") || serviceId.startsWith("https://"))
                ? serviceId
                : "http://" + serviceId;
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.maxRetries = Math.max(0, maxRetries);
    }

    public CustomerProfileDto getCustomerProfile(String identitySubject) {
        if (identitySubject == null || identitySubject.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authenticated subject is required.");
        }
        String bearerToken = SecurityUtils.getBearerToken();
        String correlationId = resolveCorrelationId();

        return executeWithRetry("getCustomerProfile", () -> {
            RestClient.RequestHeadersSpec<?> spec;
            if (bearerToken != null && !bearerToken.isBlank()) {
                spec = restClient.get()
                        .uri(LoanConstants.PATH_CUSTOMER_ME)
                        .headers(h -> {
                            h.setBearerAuth(bearerToken);
                            h.set(LoanConstants.HEADER_CORRELATION_ID, correlationId);
                        });
            } else {
                spec = restClient.get()
                        .uri(LoanConstants.PATH_CUSTOMER_BY_IDENTITY, identitySubject)
                        .headers(h -> h.set(LoanConstants.HEADER_CORRELATION_ID, correlationId));
            }

            CustomerProfileDto profile = spec.retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        if (status == 404) {
                            throw ApiException.notFound("CUSTOMER_NOT_FOUND",
                                    "Customer profile not found for authenticated identity.");
                        }
                        if (status == 401) {
                            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED",
                                    "Customer identity token rejected by Customer Service.");
                        }
                        throw ApiException.forbidden("CUSTOMER_ACCESS_DENIED",
                                "Unable to access customer profile (HTTP " + status + ").");
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("CUSTOMER_SERVICE_UNAVAILABLE",
                                "Customer Service returned HTTP " + res.getStatusCode().value());
                    })
                    .body(CustomerProfileDto.class);

            if (profile == null) {
                throw ApiException.notFound("CUSTOMER_NOT_FOUND", "Customer profile not found.");
            }
            return profile;
        });
    }

    public CustomerKycContext verifyCustomerAndFetchKyc(String identitySubject) {
        CustomerProfileDto profile = getCustomerProfile(identitySubject);

        String kycStatus = profile.kycStatus() != null ? profile.kycStatus().trim().toUpperCase() : "NOT_STARTED";
        if (!LoanConstants.VERIFIED_KYC_STATUSES.contains(kycStatus)) {
            throw ApiException.forbidden("KYC_NOT_VERIFIED",
                    "Loan application requires verified KYC. Current KYC status: " + kycStatus);
        }

        if ("HIGH_BLOCKED".equalsIgnoreCase(profile.riskCategory())
                || "BLOCKED".equalsIgnoreCase(profile.riskCategory())) {
            throw ApiException.forbidden("CUSTOMER_RISK_RESTRICTED",
                    "Customer profile is restricted from loan applications due to risk status: "
                            + profile.riskCategory());
        }

        String bearerToken = SecurityUtils.getBearerToken();
        String correlationId = resolveCorrelationId();
        KycApplicationDto kycCase = null;
        List<KycDocumentDto> documents = List.of();

        if (bearerToken != null && !bearerToken.isBlank()) {
            kycCase = fetchLatestKycBestEffort(bearerToken, correlationId);
            if (kycCase != null && kycCase.status() != null
                    && !LoanConstants.VERIFIED_KYC_STATUSES.contains(kycCase.status().trim().toUpperCase())) {
                throw ApiException.forbidden("KYC_NOT_VERIFIED",
                        "Latest KYC application is not verified. Status: " + kycCase.status());
            }
            documents = fetchKycDocumentsBestEffort(bearerToken, correlationId);
        }

        return new CustomerKycContext(profile, kycCase, documents);
    }

    private KycApplicationDto fetchLatestKycBestEffort(String bearerToken, String correlationId) {
        try {
            return restClient.get()
                    .uri(LoanConstants.PATH_CUSTOMER_ME_KYC)
                    .headers(h -> {
                        h.setBearerAuth(bearerToken);
                        h.set(LoanConstants.HEADER_CORRELATION_ID, correlationId);
                    })
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        // Customer profile already confirmed APPROVED; ignore 404 if no separate KYC case row
                        if (res.getStatusCode().value() == 404) {
                            return;
                        }
                        throw ApiException.serviceUnavailable("KYC_LOOKUP_FAILED",
                                "Failed to retrieve KYC application details.");
                    })
                    .body(KycApplicationDto.class);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.debug("Optional KYC case lookup skipped/unavailable: {}", ex.getMessage());
            return null;
        }
    }

    private List<KycDocumentDto> fetchKycDocumentsBestEffort(String bearerToken, String correlationId) {
        try {
            List<KycDocumentDto> docs = restClient.get()
                    .uri(LoanConstants.PATH_CUSTOMER_ME_KYC_DOCUMENTS)
                    .headers(h -> {
                        h.setBearerAuth(bearerToken);
                        h.set(LoanConstants.HEADER_CORRELATION_ID, correlationId);
                    })
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        if (res.getStatusCode().value() == 404) {
                            return;
                        }
                        throw ApiException.serviceUnavailable("KYC_DOCUMENTS_LOOKUP_FAILED",
                                "Failed to retrieve verified KYC documents.");
                    })
                    .body(new ParameterizedTypeReference<>() {});
            return docs != null ? docs : List.of();
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.debug("Optional KYC document lookup skipped/unavailable: {}", ex.getMessage());
            return List.of();
        }
    }

    private <T> T executeWithRetry(String operation, Supplier<T> action) {
        int attempt = 0;
        while (true) {
            try {
                return action.get();
            } catch (ApiException ex) {
                if (!ex.getHttpStatus().is5xxServerError() || attempt >= maxRetries) {
                    throw ex;
                }
                attempt++;
                log.warn("Retrying Customer Service {} (attempt {}/{})", operation, attempt, maxRetries);
            } catch (ResourceAccessException ex) {
                if (attempt >= maxRetries) {
                    if (ex.getCause() instanceof SocketTimeoutException) {
                        throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "CUSTOMER_SERVICE_TIMEOUT",
                                "Customer Service timed out during " + operation);
                    }
                    throw ApiException.serviceUnavailable("CUSTOMER_SERVICE_UNAVAILABLE",
                            "Customer Service is currently unreachable.");
                }
                attempt++;
                log.warn("Transient connection error calling Customer Service {} (attempt {}/{}): {}",
                        operation, attempt, maxRetries, ex.getMessage());
            } catch (Exception ex) {
                log.error("Unexpected error calling Customer Service {}: {}", operation, ex.getMessage(), ex);
                throw ApiException.serviceUnavailable("CUSTOMER_SERVICE_UNAVAILABLE",
                        "Unable to contact Customer Service.");
            }
        }
    }

    private String resolveCorrelationId() {
        String id = MDC.get(LoanConstants.MDC_CORRELATION_ID);
        return (id != null && !id.isBlank()) ? id : UUID.randomUUID().toString();
    }
}
