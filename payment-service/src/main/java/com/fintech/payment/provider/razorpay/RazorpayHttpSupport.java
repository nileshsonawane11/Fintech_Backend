package com.fintech.payment.provider.razorpay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.function.Supplier;

@Component
public class RazorpayHttpSupport {

    private static final Logger log = LoggerFactory.getLogger(RazorpayHttpSupport.class);

    private final ObjectMapper objectMapper;

    public RazorpayHttpSupport(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String basicAuthHeader(String keyId, String keySecret) {
        String raw = keyId + ":" + keySecret;
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public void applyAuthHeaders(HttpHeaders headers, String keyId, String keySecret) {
        headers.set(HttpHeaders.AUTHORIZATION, basicAuthHeader(keyId, keySecret));
    }

    public JsonNode parseJson(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "Razorpay returned an empty response body");
        }
        try {
            return objectMapper.readTree(raw);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "Razorpay returned malformed JSON response");
        }
    }

    public <T> T executeGetWithRetries(int maxRetries, String operationName, Supplier<T> action) {
        int attempt = 0;
        while (true) {
            try {
                return action.get();
            } catch (ResourceAccessException ex) {
                if (attempt >= maxRetries) {
                    log.warn("Razorpay GET operation={} timed out after {} attempts: {}",
                            operationName, attempt + 1, ex.getMessage());
                    throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                            "Razorpay timed out during " + operationName);
                }
                attempt++;
            } catch (RestClientResponseException ex) {
                if (ex.getStatusCode().is5xxServerError() && attempt < maxRetries) {
                    attempt++;
                    continue;
                }
                throw mapProviderHttpException(operationName, ex);
            }
        }
    }

    public ApiException mapProviderHttpException(String operationName, RestClientResponseException ex) {
        HttpStatusCode status = ex.getStatusCode();
        String providerCode = "PROVIDER_ERROR";
        String providerMessage = "Razorpay rejected " + operationName;

        try {
            String body = ex.getResponseBodyAsString();
            if (body != null && !body.isBlank()) {
                JsonNode root = objectMapper.readTree(body);
                JsonNode err = root.path("error");
                if (!err.isMissingNode()) {
                    if (err.hasNonNull("code")) {
                        providerCode = "RZP_" + err.get("code").asText().toUpperCase();
                    }
                    if (err.hasNonNull("description")) {
                        providerMessage = err.get("description").asText();
                    }
                }
            }
        } catch (Exception ignored) {
            // Keep safe generic provider message without exposing raw internal response
        }

        if (status.value() == 401 || status.value() == 403) {
            return new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_AUTH_FAILED",
                    "Razorpay rejected credentials or capability is not enabled for " + operationName);
        }
        if (status.value() == 400 || status.value() == 422) {
            return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, providerCode, providerMessage);
        }
        if (status.value() == 404) {
            return new ApiException(HttpStatus.NOT_FOUND, providerCode, providerMessage);
        }
        return new ApiException(HttpStatus.BAD_GATEWAY, providerCode, providerMessage);
    }
}
