package com.fintech.payment.config;

import com.fintech.payment.constants.PaymentConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = PaymentConstants.PROP_PREFIX_RAZORPAY)
public class RazorpayProperties {

    private String environment = "test";
    private String baseUrl = "https://api.razorpay.com/v1";
    private String keyId = "";
    private String keySecret = "";
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 15000;
    private int maxGetRetries = 2;
    private boolean autoCapture = true;
    private Webhook webhook = new Webhook();

    public boolean isOrdersConfigured() {
        return keyId != null && !keyId.isBlank()
                && keySecret != null && !keySecret.isBlank();
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
    public boolean isAutoCapture() { return autoCapture; }
    public void setAutoCapture(boolean autoCapture) { this.autoCapture = autoCapture; }
    public Webhook getWebhook() { return webhook; }
    public void setWebhook(Webhook webhook) { this.webhook = webhook; }

    public static class Webhook {
        private String secret = "";

        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
    }
}
