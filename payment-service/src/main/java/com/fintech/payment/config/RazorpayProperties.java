package com.fintech.payment.config;

import com.fintech.payment.constants.PaymentConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = PaymentConstants.PROP_PREFIX_RAZORPAY)
public class RazorpayProperties {

    private String environment = "test";
    private String baseUrl = "https://api.razorpay.com/v1";
    private String keyId = "rzp_test_S4sX5okSKuRRvq";
    private String keySecret = "ESSc6xxF6BAGZ21PFNWso9Dn";
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 15000;
    private int maxGetRetries = 2;
    private SmartCollect smartCollect = new SmartCollect();
    private RazorpayX razorpayx = new RazorpayX();
    private Webhook webhook = new Webhook();

    public boolean isSmartCollectConfigured() {
        return smartCollect.isEnabled() && keyId != null && !keyId.isBlank() && keySecret != null && !keySecret.isBlank();
    }

    public boolean isRazorpayXConfigured() {
        String effectiveKeyId = (razorpayx.getKeyId() != null && !razorpayx.getKeyId().isBlank()) ? razorpayx.getKeyId() : keyId;
        String effectiveSecret = (razorpayx.getKeySecret() != null && !razorpayx.getKeySecret().isBlank()) ? razorpayx.getKeySecret() : keySecret;
        return razorpayx.isEnabled()
                && effectiveKeyId != null && !effectiveKeyId.isBlank()
                && effectiveSecret != null && !effectiveSecret.isBlank()
                && razorpayx.getSourceAccountNumber() != null && !razorpayx.getSourceAccountNumber().isBlank();
    }

    public String getEffectiveRazorpayXKeyId() {
        return (razorpayx.getKeyId() != null && !razorpayx.getKeyId().isBlank()) ? razorpayx.getKeyId() : keyId;
    }

    public String getEffectiveRazorpayXKeySecret() {
        return (razorpayx.getKeySecret() != null && !razorpayx.getKeySecret().isBlank()) ? razorpayx.getKeySecret() : keySecret;
    }

    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }
    public String getKeySecret() { return keySecret; }
    public void setKeySecret(String keySecret) { this.keySecret = keySecret; }
    public int getConnectTimeoutMs() { return connectTimeoutMs; }
    public void setConnectTimeoutMs(int connectTimeoutMs) { this.connectTimeoutMs = connectTimeoutMs; }
    public int getReadTimeoutMs() { return readTimeoutMs; }
    public void setReadTimeoutMs(int readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }
    public int getMaxGetRetries() { return maxGetRetries; }
    public void setMaxGetRetries(int maxGetRetries) { this.maxGetRetries = maxGetRetries; }
    public SmartCollect getSmartCollect() { return smartCollect; }
    public void setSmartCollect(SmartCollect smartCollect) { this.smartCollect = smartCollect; }
    public RazorpayX getRazorpayx() { return razorpayx; }
    public void setRazorpayx(RazorpayX razorpayx) { this.razorpayx = razorpayx; }
    public Webhook getWebhook() { return webhook; }
    public void setWebhook(Webhook webhook) { this.webhook = webhook; }

    public static class SmartCollect {
        private boolean enabled = true;
        private List<String> defaultReceiverTypes = new ArrayList<>(List.of("bank_account", "vpa"));
        private boolean requireSettlementConfirmation = false;
        private boolean autoCreditEligiblePayments = true;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public List<String> getDefaultReceiverTypes() { return defaultReceiverTypes; }
        public void setDefaultReceiverTypes(List<String> defaultReceiverTypes) { this.defaultReceiverTypes = defaultReceiverTypes; }
        public boolean isRequireSettlementConfirmation() { return requireSettlementConfirmation; }
        public void setRequireSettlementConfirmation(boolean requireSettlementConfirmation) { this.requireSettlementConfirmation = requireSettlementConfirmation; }
        public boolean isAutoCreditEligiblePayments() { return autoCreditEligiblePayments; }
        public void setAutoCreditEligiblePayments(boolean autoCreditEligiblePayments) { this.autoCreditEligiblePayments = autoCreditEligiblePayments; }
    }

    public static class RazorpayX {
        private boolean enabled = true;
        private String baseUrl = "https://api.razorpay.com/v1";
        private String keyId = "";
        private String keySecret = "";
        private String sourceAccountNumber = "";
        private String payoutPurpose = "payout";
        private boolean queueIfLowBalance = false;
        private Validation validation = new Validation();

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public String getKeyId() { return keyId; }
        public void setKeyId(String keyId) { this.keyId = keyId; }
        public String getKeySecret() { return keySecret; }
        public void setKeySecret(String keySecret) { this.keySecret = keySecret; }
        public String getSourceAccountNumber() { return sourceAccountNumber; }
        public void setSourceAccountNumber(String sourceAccountNumber) { this.sourceAccountNumber = sourceAccountNumber; }
        public String getPayoutPurpose() { return payoutPurpose; }
        public void setPayoutPurpose(String payoutPurpose) { this.payoutPurpose = payoutPurpose; }
        public boolean isQueueIfLowBalance() { return queueIfLowBalance; }
        public void setQueueIfLowBalance(boolean queueIfLowBalance) { this.queueIfLowBalance = queueIfLowBalance; }
        public Validation getValidation() { return validation; }
        public void setValidation(Validation validation) { this.validation = validation; }
    }

    public static class Validation {
        private boolean enabled = true;
        private long pennyDropAmountPaise = 100L;
        private boolean pennilessEnabled = false;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public long getPennyDropAmountPaise() { return pennyDropAmountPaise; }
        public void setPennyDropAmountPaise(long pennyDropAmountPaise) { this.pennyDropAmountPaise = pennyDropAmountPaise; }
        public boolean isPennilessEnabled() { return pennilessEnabled; }
        public void setPennilessEnabled(boolean pennilessEnabled) { this.pennilessEnabled = pennilessEnabled; }
    }

    public static class Webhook {
        private String secret = "";
        private String payoutSecret = "";

        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public String getPayoutSecret() { return payoutSecret; }
        public void setPayoutSecret(String payoutSecret) { this.payoutSecret = payoutSecret; }
    }
}
