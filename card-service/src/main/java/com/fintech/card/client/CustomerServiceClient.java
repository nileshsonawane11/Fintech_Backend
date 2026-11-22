package com.fintech.card.client;

import com.fintech.card.client.dto.AddressVerificationDto;
import com.fintech.card.client.dto.CustomerProfileDto;
import com.fintech.card.exception.*;
import com.fintech.card.util.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.UUID;

@Component
public class CustomerServiceClient {

    private static final Logger log = LoggerFactory.getLogger(CustomerServiceClient.class);

    private final RestClient restClient;

    public CustomerServiceClient(
            @LoadBalanced RestClient.Builder restClientBuilder,
            @Value("${app.services.customer-service.service-id:CUSTOMER-SERVICE}") String customerServiceId) {
        String baseUrl = customerServiceId.startsWith("http://") || customerServiceId.startsWith("https://")
                ? customerServiceId
                : "http://" + customerServiceId;
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .build();
    }

    public AddressVerificationDto getAddressVerification(String addressId) {
        if (addressId == null || addressId.isBlank()) {
            throw new AddressNotFoundException("Delivery address ID must not be blank.");
        }

        String correlationId = resolveCorrelationId();
        String bearerToken = extractBearerToken();

        log.info("Calling Customer Service to verify delivery address: addressId={}, correlationId={}", addressId, correlationId);

        try {
            return restClient.get()
                    .uri("/internal/api/v1/addresses/{addressId}", addressId)
                    .header(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId)
                    .headers(headers -> {
                        if (bearerToken != null) {
                            headers.setBearerAuth(bearerToken);
                        }
                    })
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        log.warn("Customer Service responded with 4xx for address: status={}, correlationId={}", status, correlationId);
                        if (status == 404) {
                            throw new AddressNotFoundException("Address " + addressId + " was not found in Customer Service.");
                        } else if (status == 403) {
                            throw new AddressOwnershipMismatchException("Access denied for address: " + addressId);
                        }
                        throw new AddressNotFoundException("Address lookup failed with status: " + status);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        log.error("Customer Service returned 5xx for address lookup: status={}, correlationId={}", status, correlationId);
                        if (status == 504) {
                            throw new ExternalServiceTimeoutException("Customer Service timed out while verifying address: " + addressId);
                        }
                        throw new ExternalServiceUnavailableException("Customer Service failed with server error (HTTP " + status + ").");
                    })
                    .body(AddressVerificationDto.class);

        } catch (AddressNotFoundException | AddressOwnershipMismatchException | ExternalServiceTimeoutException | ExternalServiceUnavailableException e) {
            throw e;
        } catch (ResourceAccessException rae) {
            log.error("Connection or timeout error while contacting Customer Service: correlationId={}, message={}", correlationId, rae.getMessage());
            if (rae.getCause() instanceof SocketTimeoutException) {
                throw new ExternalServiceTimeoutException("Customer Service timed out during connection.");
            }
            throw new ExternalServiceUnavailableException("Customer Service is currently unreachable.");
        } catch (Exception ex) {
            log.error("Unexpected error contacting Customer Service for address: correlationId={}, error={}", correlationId, ex.getMessage(), ex);
            throw new ExternalServiceUnavailableException("Unable to contact Customer Service for address verification.");
        }
    }

    public CustomerProfileDto getCustomerProfile(String identitySubject) {
        String correlationId = resolveCorrelationId();
        String bearerToken = extractBearerToken();

        log.info("Calling Customer Service for profile: identitySubject={}, correlationId={}", identitySubject, correlationId);

        try {
            return restClient.get()
                    .uri("/api/v1/customers/by-identity/{identitySubject}", identitySubject)
                    .header(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId)
                    .headers(headers -> {
                        if (bearerToken != null) {
                            headers.setBearerAuth(bearerToken);
                        }
                    })
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        log.warn("Customer Service responded with 4xx for profile: status={}, correlationId={}", status, correlationId);
                        if (status == 404) {
                            throw new CustomerNotFoundException("Customer profile not found for identity: " + identitySubject);
                        }
                        throw new CustomerNotFoundException("Customer profile retrieval failed with status: " + status);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        log.error("Customer Service returned 5xx for profile: status={}, correlationId={}", status, correlationId);
                        if (status == 504) {
                            throw new ExternalServiceTimeoutException("Customer Service timed out while retrieving profile.");
                        }
                        throw new ExternalServiceUnavailableException("Customer Service failed with server error (HTTP " + status + ").");
                    })
                    .body(CustomerProfileDto.class);

        } catch (CustomerNotFoundException | ExternalServiceTimeoutException | ExternalServiceUnavailableException e) {
            throw e;
        } catch (ResourceAccessException rae) {
            log.error("Connection/timeout error for Customer Service profile: correlationId={}, message={}", correlationId, rae.getMessage());
            if (rae.getCause() instanceof SocketTimeoutException) {
                throw new ExternalServiceTimeoutException("Customer Service timed out during connection.");
            }
            throw new ExternalServiceUnavailableException("Customer Service is unreachable.");
        } catch (Exception ex) {
            log.error("Unexpected error retrieving Customer Service profile: correlationId={}, error={}", correlationId, ex.getMessage(), ex);
            throw new ExternalServiceUnavailableException("Unable to contact Customer Service for customer profile.");
        }
    }

    private String extractBearerToken() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getTokenValue();
        }
        return null;
    }

    private String resolveCorrelationId() {
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
        return (correlationId != null && !correlationId.isBlank()) ? correlationId : UUID.randomUUID().toString();
    }
}
