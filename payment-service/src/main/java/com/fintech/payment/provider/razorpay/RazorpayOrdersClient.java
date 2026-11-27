package com.fintech.payment.provider.razorpay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.RazorpayOrdersProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class RazorpayOrdersClient implements RazorpayOrdersProvider {

    private static final Logger log = LoggerFactory.getLogger(RazorpayOrdersClient.class);

    private final RazorpayProperties properties;
    private final RazorpayHttpSupport httpSupport;
    private final RestClient restClient;

    @Autowired
    public RazorpayOrdersClient(RazorpayProperties properties, RazorpayHttpSupport httpSupport) {
        this(properties, httpSupport, buildRestClient(properties));
    }

    public RazorpayOrdersClient(RazorpayProperties properties, RazorpayHttpSupport httpSupport, RestClient restClient) {
        this.properties = properties;
        this.httpSupport = httpSupport;
        this.restClient = restClient;
    }

    private static RestClient buildRestClient(RazorpayProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(properties.getConnectTimeoutMs()));
        requestFactory.setReadTimeout(Duration.ofMillis(properties.getReadTimeoutMs()));
        return RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public RazorpayOrderResult createOrder(CreateOrderCommand command) {
        ensureConfigured();
        long amountPaise = RazorpayMoneyUtils.toPaise(command.amount());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amountPaise);
        body.put("currency", command.currency());
        body.put("receipt", command.receipt());
        body.put("payment_capture", command.autoCapture() ? 1 : 0);
        if (command.notes() != null && !command.notes().isEmpty()) {
            body.put("notes", command.notes());
        }

        try {
            String raw = restClient.post()
                    .uri(PaymentConstants.RZP_ORDERS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> httpSupport.applyAuthHeaders(h, properties.getKeyId(), properties.getKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode node = httpSupport.parseJson(raw);
            return mapOrder(node);
        } catch (ResourceAccessException ex) {
            log.warn("Razorpay createOrder timed out for receipt={}: {}", command.receipt(), ex.getMessage());
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "Razorpay timed out while creating order");
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("createOrder", ex);
        }
    }

    @Override
    public RazorpayOrderResult fetchOrder(String razorpayOrderId) {
        ensureConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchOrder", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_ORDER_BY_ID, razorpayOrderId)
                    .headers(h -> httpSupport.applyAuthHeaders(h, properties.getKeyId(), properties.getKeySecret()))
                    .retrieve()
                    .body(String.class);
            return mapOrder(httpSupport.parseJson(raw));
        });
    }

    @Override
    public List<RazorpayPaymentResult> fetchOrderPayments(String razorpayOrderId) {
        ensureConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchOrderPayments", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_ORDER_PAYMENTS, razorpayOrderId)
                    .headers(h -> httpSupport.applyAuthHeaders(h, properties.getKeyId(), properties.getKeySecret()))
                    .retrieve()
                    .body(String.class);
            JsonNode root = httpSupport.parseJson(raw);
            List<RazorpayPaymentResult> results = new ArrayList<>();
            JsonNode items = root.path("items");
            if (items.isArray()) {
                for (JsonNode item : items) {
                    results.add(mapPayment(item));
                }
            }
            return results;
        });
    }

    @Override
    public RazorpayPaymentResult fetchPayment(String razorpayPaymentId) {
        ensureConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchPayment", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_PAYMENT_BY_ID, razorpayPaymentId)
                    .headers(h -> httpSupport.applyAuthHeaders(h, properties.getKeyId(), properties.getKeySecret()))
                    .retrieve()
                    .body(String.class);
            return mapPayment(httpSupport.parseJson(raw));
        });
    }

    @Override
    public RazorpayPaymentResult capturePayment(CapturePaymentCommand command) {
        ensureConfigured();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", RazorpayMoneyUtils.toPaise(command.amount()));
        body.put("currency", command.currency());

        try {
            String raw = restClient.post()
                    .uri(PaymentConstants.RZP_PAYMENT_CAPTURE, command.razorpayPaymentId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> httpSupport.applyAuthHeaders(h, properties.getKeyId(), properties.getKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);
            return mapPayment(httpSupport.parseJson(raw));
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "Razorpay timed out while capturing payment");
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("capturePayment", ex);
        }
    }

    @Override
    public RazorpayRefundResult refundPayment(RefundPaymentCommand command) {
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
                    .uri(PaymentConstants.RZP_PAYMENT_REFUND, command.razorpayPaymentId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> httpSupport.applyAuthHeaders(h, properties.getKeyId(), properties.getKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);
            return mapRefund(httpSupport.parseJson(raw));
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "Razorpay timed out while initiating refund");
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("refundPayment", ex);
        }
    }

    @Override
    public RazorpayRefundResult fetchRefund(String razorpayPaymentId, String razorpayRefundId) {
        ensureConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchRefund", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_PAYMENT_REFUND_BY_ID, razorpayPaymentId, razorpayRefundId)
                    .headers(h -> httpSupport.applyAuthHeaders(h, properties.getKeyId(), properties.getKeySecret()))
                    .retrieve()
                    .body(String.class);
            return mapRefund(httpSupport.parseJson(raw));
        });
    }

    private void ensureConfigured() {
        if (!properties.isOrdersConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "RAZORPAY_NOT_CONFIGURED",
                    "Razorpay API credentials are not configured");
        }
    }

    private RazorpayOrderResult mapOrder(JsonNode node) {
        String id = node.path("id").asText("");
        if (id.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "Razorpay order response is missing order id");
        }
        return new RazorpayOrderResult(
                id,
                RazorpayMoneyUtils.fromPaise(node.path("amount").asLong(0L)),
                RazorpayMoneyUtils.fromPaise(node.path("amount_paid").asLong(0L)),
                RazorpayMoneyUtils.fromPaise(node.path("amount_due").asLong(0L)),
                node.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY),
                node.path("receipt").asText(null),
                node.path("status").asText("created"),
                node.path("attempts").asInt(0),
                node.hasNonNull("created_at") ? Instant.ofEpochSecond(node.path("created_at").asLong()) : Instant.now()
        );
    }

    private RazorpayPaymentResult mapPayment(JsonNode node) {
        String id = node.path("id").asText("");
        if (id.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "Razorpay payment response is missing payment id");
        }
        return new RazorpayPaymentResult(
                id,
                node.path("order_id").asText(null),
                RazorpayMoneyUtils.fromPaise(node.path("amount").asLong(0L)),
                node.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY),
                node.path("status").asText("created"),
                node.path("method").asText(null),
                node.path("captured").asBoolean(false),
                node.path("email").asText(null),
                node.path("contact").asText(null),
                node.path("error_code").asText(null),
                node.path("error_description").asText(null),
                node.hasNonNull("created_at") ? Instant.ofEpochSecond(node.path("created_at").asLong()) : Instant.now()
        );
    }

    private RazorpayRefundResult mapRefund(JsonNode node) {
        String id = node.path("id").asText("");
        if (id.isBlank()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "Razorpay refund response is missing refund id");
        }
        BigDecimal amt = RazorpayMoneyUtils.fromPaise(node.path("amount").asLong(0L));
        return new RazorpayRefundResult(
                id,
                node.path("payment_id").asText(null),
                amt,
                node.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY),
                node.path("status").asText("pending"),
                node.hasNonNull("created_at") ? Instant.ofEpochSecond(node.path("created_at").asLong()) : Instant.now()
        );
    }
}
