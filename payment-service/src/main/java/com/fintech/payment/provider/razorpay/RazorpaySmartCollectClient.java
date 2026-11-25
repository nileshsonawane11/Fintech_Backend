package com.fintech.payment.provider.razorpay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.IncomingCollectionProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class RazorpaySmartCollectClient implements IncomingCollectionProvider {

    private static final Logger log = LoggerFactory.getLogger(RazorpaySmartCollectClient.class);

    private final RestClient restClient;
    private final RazorpayProperties properties;
    private final RazorpayHttpSupport httpSupport;
    private final ObjectMapper objectMapper;

    public RazorpaySmartCollectClient(
            RestClient.Builder restClientBuilder,
            RazorpayProperties properties,
            RazorpayHttpSupport httpSupport,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpSupport = httpSupport;
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.baseUrl(properties.getBaseUrl()).build();
    }

    @Override
    public String providerName() {
        return PaymentConstants.PROVIDER_RAZORPAY_SMART_COLLECT;
    }

    @Override
    public boolean isAvailable() {
        return properties.isSmartCollectConfigured();
    }

    @Override
    public ProviderCustomerResult createOrGetCustomer(ProviderCustomerRequest request) {
        ensureConfigured();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", request.name());
        if (request.email() != null && !request.email().isBlank()) {
            body.put("email", request.email());
        }
        if (request.contact() != null && !request.contact().isBlank()) {
            body.put("contact", request.contact());
        }
        body.put("fail_existing", "0");
        if (request.notes() != null && !request.notes().isEmpty()) {
            body.put("notes", request.notes());
        }

        try {
            String rawResponse = restClient.post()
                    .uri(PaymentConstants.RZP_CUSTOMERS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> httpSupport.applyAuthHeaders(headers, properties.getKeyId(), properties.getKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode response = httpSupport.parseJson(rawResponse);

            if (response == null || !response.hasNonNull("id")) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                        "Razorpay customer creation returned empty response");
            }
            return new ProviderCustomerResult(
                    response.path("id").asText(),
                    response.path("name").asText(request.name()),
                    response.path("email").asText(null)
            );
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("createCustomer", ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "Razorpay customer creation timed out");
        }
    }

    @Override
    public VirtualAccountResult createVirtualAccount(CreateVirtualAccountCommand command) {
        ensureConfigured();
        List<String> types = (command.receiverTypes() != null && !command.receiverTypes().isEmpty())
                ? command.receiverTypes()
                : properties.getSmartCollect().getDefaultReceiverTypes();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("receivers", Map.of("types", types));
        body.put("customer_id", command.providerCustomerId());
        if (command.description() != null && !command.description().isBlank()) {
            body.put("description", command.description());
        }
        if (command.closeBy() != null) {
            body.put("close_by", command.closeBy().getEpochSecond());
        }
        if (command.notes() != null && !command.notes().isEmpty()) {
            body.put("notes", command.notes());
        }

        try {
            String rawResponse = restClient.post()
                    .uri(PaymentConstants.RZP_VIRTUAL_ACCOUNTS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> httpSupport.applyAuthHeaders(headers, properties.getKeyId(), properties.getKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);

            return parseVirtualAccount(httpSupport.parseJson(rawResponse));
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("createVirtualAccount", ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "Razorpay virtual account creation timed out");
        }
    }

    @Override
    public VirtualAccountResult fetchVirtualAccount(String providerVaId) {
        ensureConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchVirtualAccount", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_VIRTUAL_ACCOUNT_BY_ID, providerVaId)
                    .headers(headers -> httpSupport.applyAuthHeaders(headers, properties.getKeyId(), properties.getKeySecret()))
                    .retrieve()
                    .body(String.class);
            return parseVirtualAccount(httpSupport.parseJson(raw));
        });
    }

    @Override
    public List<ProviderPaymentResult> fetchVirtualAccountPayments(String providerVaId) {
        ensureConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchVirtualAccountPayments", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_VIRTUAL_ACCOUNT_PAYMENTS, providerVaId)
                    .headers(headers -> httpSupport.applyAuthHeaders(headers, properties.getKeyId(), properties.getKeySecret()))
                    .retrieve()
                    .body(String.class);
            JsonNode response = httpSupport.parseJson(raw);

            List<ProviderPaymentResult> payments = new ArrayList<>();
            if (response != null && response.has("items") && response.get("items").isArray()) {
                for (JsonNode item : response.get("items")) {
                    payments.add(parsePayment(item, providerVaId));
                }
            }
            return payments;
        });
    }

    @Override
    public ProviderPaymentResult fetchPayment(String providerPaymentId) {
        ensureConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchPayment", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_PAYMENT_BY_ID, providerPaymentId)
                    .headers(headers -> httpSupport.applyAuthHeaders(headers, properties.getKeyId(), properties.getKeySecret()))
                    .retrieve()
                    .body(String.class);
            return parsePayment(httpSupport.parseJson(raw), null);
        });
    }

    @Override
    public VirtualAccountResult closeVirtualAccount(String providerVaId) {
        ensureConfigured();
        try {
            String raw = restClient.post()
                    .uri(PaymentConstants.RZP_VIRTUAL_ACCOUNT_CLOSE, providerVaId)
                    .headers(headers -> httpSupport.applyAuthHeaders(headers, properties.getKeyId(), properties.getKeySecret()))
                    .retrieve()
                    .body(String.class);
            return parseVirtualAccount(httpSupport.parseJson(raw));
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("closeVirtualAccount", ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "Razorpay close virtual account timed out");
        }
    }

    @Override
    public RefundPaymentResult refundPayment(RefundPaymentCommand command) {
        ensureConfigured();
        Map<String, Object> body = new LinkedHashMap<>();
        if (command.amount() != null) {
            body.put("amount", RazorpayMoneyUtils.toPaise(command.amount()));
        }
        if (command.receipt() != null && !command.receipt().isBlank()) {
            body.put("receipt", command.receipt());
        }
        if (command.notes() != null && !command.notes().isEmpty()) {
            body.put("notes", command.notes());
        }

        try {
            String raw = restClient.post()
                    .uri(PaymentConstants.RZP_PAYMENT_REFUND, command.providerPaymentId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> httpSupport.applyAuthHeaders(headers, properties.getKeyId(), properties.getKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode response = httpSupport.parseJson(raw);

            if (response == null || !response.hasNonNull("id")) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                        "Razorpay refund returned empty response");
            }
            return new RefundPaymentResult(
                    response.path("id").asText(),
                    response.path("payment_id").asText(command.providerPaymentId()),
                    RazorpayMoneyUtils.fromPaise(response.path("amount").asLong(0L)),
                    response.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY),
                    response.path("status").asText("pending")
            );
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("refundPayment", ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "Razorpay refund request timed out; verify refund status before retrying");
        }
    }

    private VirtualAccountResult parseVirtualAccount(JsonNode node) {
        if (node == null || !node.hasNonNull("id")) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "Razorpay virtual account response was empty or missing id");
        }
        String accountNumber = null;
        String ifsc = null;
        String bankName = null;
        String accountName = node.path("name").asText(null);
        String vpaAddress = null;

        JsonNode receivers = node.path("receivers");
        if (receivers.isArray()) {
            for (JsonNode receiver : receivers) {
                String entity = receiver.path("entity").asText("");
                if ("bank_account".equalsIgnoreCase(entity)) {
                    accountNumber = receiver.path("account_number").asText(null);
                    ifsc = receiver.path("ifsc").asText(null);
                    bankName = receiver.path("bank_name").asText(null);
                    if (receiver.hasNonNull("name")) {
                        accountName = receiver.get("name").asText();
                    }
                } else if ("vpa".equalsIgnoreCase(entity)) {
                    vpaAddress = receiver.path("address").asText(null);
                }
            }
        }
        Instant closeBy = node.hasNonNull("close_by") && node.get("close_by").asLong(0L) > 0
                ? Instant.ofEpochSecond(node.get("close_by").asLong())
                : null;

        return new VirtualAccountResult(
                node.path("id").asText(),
                node.path("customer_id").asText(null),
                node.path("status").asText("active").toUpperCase(),
                accountName,
                node.path("description").asText(null),
                accountNumber,
                ifsc,
                bankName,
                vpaAddress,
                closeBy
        );
    }

    private ProviderPaymentResult parsePayment(JsonNode node, String fallbackVaId) {
        if (node == null || !node.hasNonNull("id")) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "Razorpay payment response was empty or missing id");
        }
        long amountPaise = node.path("amount").asLong(0L);
        BigDecimal amount = amountPaise > 0 ? RazorpayMoneyUtils.fromPaise(amountPaise) : BigDecimal.ZERO;
        String utr = node.path("acquirer_data").path("utr").asText(null);
        if (utr == null || utr.isBlank()) {
            utr = node.path("acquirer_data").path("rrn").asText(null);
        }
        Instant createdAt = node.hasNonNull("created_at") && node.get("created_at").asLong(0L) > 0
                ? Instant.ofEpochSecond(node.get("created_at").asLong())
                : Instant.now();

        return new ProviderPaymentResult(
                node.path("id").asText(),
                fallbackVaId,
                amount,
                node.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY),
                node.path("status").asText(""),
                node.path("method").asText(""),
                node.path("email").asText(null),
                node.path("vpa").asText(null),
                node.path("bank").asText(null),
                utr,
                node.path("error_code").asText(null),
                node.path("error_description").asText(null),
                createdAt
        );
    }

    private void ensureConfigured() {
        if (!properties.getSmartCollect().isEnabled()) {
            throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "SMART_COLLECT_DISABLED",
                    "Razorpay Smart Collect 2.0 capability is disabled in configuration");
        }
        if (!properties.isSmartCollectConfigured()) {
            log.warn("Razorpay Smart Collect credentials are not configured");
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PROVIDER_NOT_CONFIGURED",
                    "Razorpay Smart Collect credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured");
        }
    }
}
