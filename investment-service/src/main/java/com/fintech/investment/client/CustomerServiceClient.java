package com.fintech.investment.client;

import com.fintech.investment.client.dto.ExternalDtos.CustomerProfileDto;
import com.fintech.investment.config.SecurityUtils;
import com.fintech.investment.constants.InvestmentConstants;
import com.fintech.investment.exception.ApiException;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class CustomerServiceClient {

    private final RestClient restClient;

    public CustomerServiceClient(
            @Qualifier("loadBalancedRestClientBuilder") RestClient.Builder builder,
            @Value("${app.services.customer-service.service-id:CUSTOMER-SERVICE}") String serviceId) {
        String baseUrl = serviceId.startsWith("http") ? serviceId : "http://" + serviceId;
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public CustomerProfileDto getCurrentCustomerProfile() {
        String token = SecurityUtils.getBearerToken();
        if (token == null || token.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "MISSING_TOKEN", "Missing Bearer JWT for customer lookup.");
        }
        String correlationId = resolveCorrelationId();
        try {
            CustomerProfileDto profile = restClient.get()
                    .uri("/api/v1/customers/me")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(InvestmentConstants.HEADER_CORRELATION_ID, correlationId)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw ApiException.badRequest("CUSTOMER_PROFILE_UNAVAILABLE",
                                "Unable to verify customer profile (HTTP " + res.getStatusCode().value() + ").");
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw ApiException.serviceUnavailable("CUSTOMER_SERVICE_UNAVAILABLE",
                                "Customer Service is currently unavailable.");
                    })
                    .body(CustomerProfileDto.class);
            if (profile == null) {
                throw ApiException.serviceUnavailable("CUSTOMER_SERVICE_UNAVAILABLE", "Empty customer profile response.");
            }
            return profile;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.serviceUnavailable("CUSTOMER_SERVICE_UNAVAILABLE",
                    "Customer Service unreachable: " + ex.getMessage());
        }
    }

    private String resolveCorrelationId() {
        String cid = MDC.get(InvestmentConstants.MDC_CORRELATION_ID);
        return (cid != null && !cid.isBlank()) ? cid : UUID.randomUUID().toString();
    }
}
