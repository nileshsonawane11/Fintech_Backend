package com.fintech.payment.provider;

public interface WebhookSignatureVerifier {

    boolean isConfigured(String secret);

    boolean verifySignature(byte[] rawPayload, String suppliedSignature, String secret);
}
