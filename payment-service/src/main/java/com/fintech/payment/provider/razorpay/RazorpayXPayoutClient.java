package com.fintech.payment.provider.razorpay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fintech.payment.config.RazorpayProperties;
import com.fintech.payment.constants.PaymentConstants;
import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.PayoutProvider;
import com.fintech.payment.provider.model.ProviderModels.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class RazorpayXPayoutClient implements PayoutProvider {

    private static final Logger log = LoggerFactory.getLogger(RazorpayXPayoutClient.class);

    private final RestClient restClient;
    private final RazorpayProperties properties;
    private final RazorpayHttpSupport httpSupport;

    public RazorpayXPayoutClient(
            RestClient.Builder restClientBuilder,
            RazorpayProperties properties,
            RazorpayHttpSupport httpSupport) {
        this.properties = properties;
        this.httpSupport = httpSupport;
        this.restClient = restClientBuilder.baseUrl(properties.getRazorpayx().getBaseUrl()).build();
    }

    @Override
    public String providerName() {
        return PaymentConstants.PROVIDER_RAZORPAYX;
    }

    @Override
    public boolean isPayoutAvailable() {
        return properties.isRazorpayXConfigured();
    }

    @Override
    public boolean isValidationAvailable() {
        return properties.isRazorpayXConfigured() && properties.getRazorpayx().getValidation().isEnabled();
    }

    @Override
    public ContactResult createContact(CreateContactCommand command) {
        ensureRazorpayXConfigured();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", command.name());
        if (command.email() != null && !command.email().isBlank()) {
            body.put("email", command.email());
        }
        if (command.contact() != null && !command.contact().isBlank()) {
            body.put("contact", command.contact());
        }
        body.put("type", command.type() != null ? command.type() : "customer");
        if (command.referenceId() != null && !command.referenceId().isBlank()) {
            body.put("reference_id", command.referenceId());
        }
        if (command.notes() != null && !command.notes().isEmpty()) {
            body.put("notes", command.notes());
        }

        try {
            String raw = restClient.post()
                    .uri(PaymentConstants.RZP_CONTACTS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> httpSupport.applyAuthHeaders(
                            h, properties.getEffectiveRazorpayXKeyId(), properties.getEffectiveRazorpayXKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode response = httpSupport.parseJson(raw);

            if (response == null || !response.hasNonNull("id")) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                        "RazorpayX contact creation returned empty response");
            }
            return new ContactResult(
                    response.path("id").asText(),
                    response.path("name").asText(command.name()),
                    response.path("type").asText("customer")
            );
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("createContact", ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "RazorpayX contact creation timed out");
        }
    }

    @Override
    public FundAccountResult createBankFundAccount(CreateBankFundAccountCommand command) {
        ensureRazorpayXConfigured();
        Map<String, Object> body = Map.of(
                "contact_id", command.providerContactId(),
                "account_type", "bank_account",
                "bank_account", Map.of(
                        "name", command.accountHolderName(),
                        "ifsc", command.ifscCode(),
                        "account_number", command.accountNumber()
                )
        );
        return postFundAccount(body, "createBankFundAccount");
    }

    @Override
    public FundAccountResult createVpaFundAccount(CreateVpaFundAccountCommand command) {
        ensureRazorpayXConfigured();
        Map<String, Object> body = Map.of(
                "contact_id", command.providerContactId(),
                "account_type", "vpa",
                "vpa", Map.of("address", command.vpaAddress())
        );
        return postFundAccount(body, "createVpaFundAccount");
    }

    private FundAccountResult postFundAccount(Map<String, Object> body, String operation) {
        try {
            String raw = restClient.post()
                    .uri(PaymentConstants.RZP_FUND_ACCOUNTS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> httpSupport.applyAuthHeaders(
                            h, properties.getEffectiveRazorpayXKeyId(), properties.getEffectiveRazorpayXKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode response = httpSupport.parseJson(raw);

            if (response == null || !response.hasNonNull("id")) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                        "RazorpayX fund account creation returned empty response");
            }
            return new FundAccountResult(
                    response.path("id").asText(),
                    response.path("contact_id").asText(null),
                    response.path("account_type").asText(null),
                    response.path("active").asBoolean(true)
            );
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException(operation, ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "RazorpayX " + operation + " timed out");
        }
    }

    @Override
    public ValidationResult validateFundAccount(ValidateFundAccountCommand command) {
        ensureValidationConfigured();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("account_number", properties.getRazorpayx().getSourceAccountNumber());
        body.put("fund_account", Map.of("id", command.providerFundAccountId()));
        if (command.amountPaise() > 0) {
            body.put("amount", command.amountPaise());
        }
        body.put("currency", command.currency() != null ? command.currency() : PaymentConstants.DEFAULT_CURRENCY);
        if (command.notes() != null && !command.notes().isEmpty()) {
            body.put("notes", command.notes());
        }

        try {
            String raw = restClient.post()
                    .uri(PaymentConstants.RZP_FUND_ACCOUNT_VALIDATIONS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> httpSupport.applyAuthHeaders(
                            h, properties.getEffectiveRazorpayXKeyId(), properties.getEffectiveRazorpayXKeySecret()))
                    .body(body)
                    .retrieve()
                    .body(String.class);

            return parseValidationResult(httpSupport.parseJson(raw), command.providerFundAccountId());
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("validateFundAccount", ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "RazorpayX fund account validation timed out");
        }
    }

    @Override
    public ValidationResult fetchValidation(String providerValidationId) {
        ensureValidationConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchValidation", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_FUND_ACCOUNT_VALIDATION_BY_ID, providerValidationId)
                    .headers(h -> httpSupport.applyAuthHeaders(
                            h, properties.getEffectiveRazorpayXKeyId(), properties.getEffectiveRazorpayXKeySecret()))
                    .retrieve()
                    .body(String.class);
            return parseValidationResult(httpSupport.parseJson(raw), null);
        });
    }

    @Override
    public PayoutResult createPayout(CreatePayoutCommand command) {
        ensureRazorpayXConfigured();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("account_number", properties.getRazorpayx().getSourceAccountNumber());
        body.put("fund_account_id", command.providerFundAccountId());
        body.put("amount", RazorpayMoneyUtils.toPaise(command.amount()));
        body.put("currency", command.currency() != null ? command.currency() : PaymentConstants.DEFAULT_CURRENCY);
        body.put("mode", command.mode());
        body.put("purpose", command.purpose() != null ? command.purpose() : properties.getRazorpayx().getPayoutPurpose());
        body.put("queue_if_low_balance", properties.getRazorpayx().isQueueIfLowBalance());
        if (command.referenceId() != null && !command.referenceId().isBlank()) {
            body.put("reference_id", command.referenceId());
        }
        if (command.narration() != null && !command.narration().isBlank()) {
            body.put("narration", command.narration());
        }
        if (command.notes() != null && !command.notes().isEmpty()) {
            body.put("notes", command.notes());
        }

        try {
            String raw = restClient.post()
                    .uri(PaymentConstants.RZP_PAYOUTS)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> {
                        httpSupport.applyAuthHeaders(
                                h, properties.getEffectiveRazorpayXKeyId(), properties.getEffectiveRazorpayXKeySecret());
                        h.set(PaymentConstants.HEADER_PAYOUT_IDEMPOTENCY, command.idempotencyKey());
                    })
                    .body(body)
                    .retrieve()
                    .body(String.class);

            return parsePayoutResult(httpSupport.parseJson(raw));
        } catch (ResourceAccessException ex) {
            // CRITICAL: Do NOT blindly retry or assume failure on network/read timeout after POST /payouts.
            // Return timedOut=true so the caller places the transfer into UNKNOWN_PENDING_RECONCILIATION.
            log.warn("RazorpayX createPayout timed out for referenceId={}: {}", command.referenceId(), ex.getMessage());
            return new PayoutResult(
                    null,
                    command.providerFundAccountId(),
                    "UNKNOWN",
                    command.amount(),
                    command.currency(),
                    command.mode(),
                    null,
                    null,
                    null,
                    "gateway",
                    "timeout",
                    "Provider payout request timed out; awaiting reconciliation",
                    true
            );
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("createPayout", ex);
        }
    }

    @Override
    public PayoutResult fetchPayout(String providerPayoutId) {
        ensureRazorpayXConfigured();
        return httpSupport.executeGetWithRetries(properties.getMaxGetRetries(), "fetchPayout", () -> {
            String raw = restClient.get()
                    .uri(PaymentConstants.RZP_PAYOUT_BY_ID, providerPayoutId)
                    .headers(h -> httpSupport.applyAuthHeaders(
                            h, properties.getEffectiveRazorpayXKeyId(), properties.getEffectiveRazorpayXKeySecret()))
                    .retrieve()
                    .body(String.class);
            return parsePayoutResult(httpSupport.parseJson(raw));
        });
    }

    @Override
    public PayoutResult cancelPayout(String providerPayoutId) {
        ensureRazorpayXConfigured();
        try {
            String raw = restClient.patch()
                    .uri(PaymentConstants.RZP_PAYOUT_CANCEL, providerPayoutId)
                    .headers(h -> httpSupport.applyAuthHeaders(
                            h, properties.getEffectiveRazorpayXKeyId(), properties.getEffectiveRazorpayXKeySecret()))
                    .retrieve()
                    .body(String.class);
            return parsePayoutResult(httpSupport.parseJson(raw));
        } catch (RestClientResponseException ex) {
            throw httpSupport.mapProviderHttpException("cancelPayout", ex);
        } catch (ResourceAccessException ex) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "PROVIDER_TIMEOUT",
                    "RazorpayX cancelPayout timed out");
        }
    }

    private ValidationResult parseValidationResult(JsonNode node, String fallbackFundAccountId) {
        if (node == null || !node.hasNonNull("id")) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "RazorpayX validation response was empty or missing id");
        }
        String faId = node.path("fund_account_id").asText(null);
        if ((faId == null || faId.isBlank()) && node.has("fund_account")) {
            faId = node.path("fund_account").path("id").asText(fallbackFundAccountId);
        }
        JsonNode results = node.has("results") ? node.path("results") : node.path("validation_results");
        JsonNode statusDetails = node.path("status_details");

        return new ValidationResult(
                node.path("id").asText(),
                faId,
                node.path("status").asText("created"),
                results.path("account_status").asText(null),
                results.path("registered_name").asText(null),
                node.path("utr").asText(null),
                statusDetails.path("source").asText(null),
                statusDetails.path("reason").asText(null),
                statusDetails.path("description").asText(null)
        );
    }

    private PayoutResult parsePayoutResult(JsonNode node) {
        if (node == null || !node.hasNonNull("id")) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PROVIDER_INVALID_RESPONSE",
                    "RazorpayX payout response was empty or missing id");
        }
        JsonNode statusDetails = node.path("status_details");
        return new PayoutResult(
                node.path("id").asText(),
                node.path("fund_account_id").asText(null),
                node.path("status").asText("processing"),
                RazorpayMoneyUtils.fromPaise(node.path("amount").asLong(0L)),
                node.path("currency").asText(PaymentConstants.DEFAULT_CURRENCY),
                node.path("mode").asText(null),
                node.path("utr").asText(null),
                node.hasNonNull("fees") ? RazorpayMoneyUtils.fromPaise(node.get("fees").asLong()) : null,
                node.hasNonNull("tax") ? RazorpayMoneyUtils.fromPaise(node.get("tax").asLong()) : null,
                statusDetails.path("source").asText(null),
                statusDetails.path("reason").asText(null),
                statusDetails.path("description").asText(null),
                false
        );
    }

    private void ensureRazorpayXConfigured() {
        if (!properties.getRazorpayx().isEnabled()) {
            throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "RAZORPAYX_DISABLED",
                    "RazorpayX Payouts capability is disabled in configuration");
        }
        if (!properties.isRazorpayXConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PROVIDER_NOT_CONFIGURED",
                    "RazorpayX credentials or source account number (RAZORPAYX_ACCOUNT_NUMBER) are not configured");
        }
    }

    private void ensureValidationConfigured() {
        ensureRazorpayXConfigured();
        if (!properties.getRazorpayx().getValidation().isEnabled()) {
            throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "ACCOUNT_VALIDATION_DISABLED",
                    "RazorpayX Fund Account Validation capability is disabled in configuration");
        }
    }
}
