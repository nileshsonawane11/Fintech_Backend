package com.fintech.payment.client;

import com.fintech.payment.client.dto.CustomerProfileDto;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class CustomerServiceClient {

    private static final Logger log = LoggerFactory.getLogger(CustomerServiceClient.class);

    private final RestClient restClient;

    public CustomerServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.customer-service.service-id:" + PaymentConstants.SERVICE_CUSTOMER + "}") String serviceId) {
        this.restClient = restClientBuilder
                .baseUrl("http://" + serviceId)
                .build();
    }

    public CustomerProfileDto getCustomerProfile(String identitySubject) {
        if (identitySubject == null || identitySubject.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authenticated subject is required");
        }
        String bearerToken = SecurityUtils.getBearerToken();
        String correlationId = MDC.get(PaymentConstants.MDC_CORRELATION_ID);

        try {
            RestClient.RequestHeadersSpec<?> spec;
            if (bearerToken != null && !bearerToken.isBlank()) {
                spec = restClient.get()
                        .uri(PaymentConstants.PATH_CUSTOMER_ME)
                        .headers(headers -> {
                            headers.setBearerAuth(bearerToken);
                            if (correlationId != null) {
                                headers.set(PaymentConstants.HEADER_CORRELATION_ID, correlationId);
                            }
                        });
            } else {
                spec = restClient.get()
                        .uri(PaymentConstants.PATH_CUSTOMER_BY_IDENTITY, identitySubject)
                        .headers(headers -> {
                            if (correlationId != null) {
                                headers.set(PaymentConstants.HEADER_CORRELATION_ID, correlationId);
                            }
                        });
            }

            CustomerProfileDto profile = spec.retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        if (res.getStatusCode().value() == 404) {
                            throw new ApiException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND",
                                    "Customer profile not found for subject");
                        }
                        throw new ApiException(HttpStatus.FORBIDDEN, "CUSTOMER_ACCESS_DENIED",
                                "Unable to access customer profile");
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CUSTOMER_SERVICE_UNAVAILABLE",
                                "Customer Service returned an internal error");
                    })
                    .body(CustomerProfileDto.class);

            if (profile == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "Customer profile not found");
            }
            return profile;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to fetch customer profile for subject={}: {}", identitySubject, ex.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CUSTOMER_SERVICE_UNAVAILABLE",
                    "Customer Service is currently unavailable");
        }
    }

    public CustomerProfileDto verifyKycApproved(String identitySubject) {
        CustomerProfileDto profile = getCustomerProfile(identitySubject);
        if (profile.kycStatus() == null || !PaymentConstants.KYC_STATUS_APPROVED.equalsIgnoreCase(profile.kycStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "KYC_NOT_APPROVED",
                    "Payment operation requires approved KYC. Current KYC status: "
                            + (profile.kycStatus() != null ? profile.kycStatus() : "NOT_STARTED"));
        }
        return profile;
    }
}
