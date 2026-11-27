package com.fintech.investment.client;

import com.fintech.investment.client.dto.ExternalDtos.*;
import com.fintech.investment.constants.InvestmentConstants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.util.UUID;

@Component
public class PaymentServiceClient {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceClient.class);

    private final RestClient restClient;
    private final String internalSecretToken;

    public PaymentServiceClient(
            @Qualifier("loadBalancedRestClientBuilder") RestClient.Builder builder,
            @Value("${app.services.payment-service.service-id:PAYMENT-SERVICE}") String serviceId,
            @Value("${app.services.internal-secret-token:finbank-internal-secret-token}") String internalSecretToken) {
        String baseUrl = serviceId.startsWith("http") ? serviceId : "http://" + serviceId;
        this.restClient = builder.baseUrl(baseUrl).build();
        this.internalSecretToken = internalSecretToken;
    }

    public Optional<MandateRegistrationResponse> registerMandateBestEffort(String idempotencyKey, RegisterMandateRequest req) {
        try {
            MandateRegistrationResponse res = restClient.post()
                    .uri(InvestmentConstants.PATH_INTERNAL_PAYMENT_MANDATES)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(InvestmentConstants.HEADER_INTERNAL_SECRET, internalSecretToken)
                    .header(InvestmentConstants.HEADER_CORRELATION_ID, resolveCorrelationId())
                    .header(InvestmentConstants.HEADER_IDEMPOTENCY_KEY, idempotencyKey)
                    .body(req)
                    .retrieve()
                    .body(MandateRegistrationResponse.class);
            return Optional.ofNullable(res);
        } catch (Exception ex) {
            log.warn("Payment mandate registration deferred/unavailable for ref={}: {}", req.mandateReference(), ex.getMessage());
            return Optional.empty();
        }
    }

    private String resolveCorrelationId() {
        String cid = MDC.get(InvestmentConstants.MDC_CORRELATION_ID);
        return (cid != null && !cid.isBlank()) ? cid : UUID.randomUUID().toString();
    }
}
