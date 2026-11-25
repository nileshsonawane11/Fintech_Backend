package com.fintech.payment.provider.razorpay;

import com.fintech.payment.exception.ApiException;
import com.fintech.payment.provider.WebhookSignatureVerifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

@Component
public class RazorpayWebhookSignatureVerifier implements WebhookSignatureVerifier {

    @Override
    public boolean isConfigured(String secret) {
        return secret != null && !secret.isBlank();
    }

    @Override
    public boolean verifySignature(byte[] rawPayload, String suppliedSignature, String secret) {
        if (!isConfigured(secret)) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "WEBHOOK_NOT_CONFIGURED",
                    "Razorpay webhook secret is not configured");
        }
        if (rawPayload == null || rawPayload.length == 0
                || suppliedSignature == null || !suppliedSignature.trim().matches("(?i)[0-9a-f]{64}")) {
            return false;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(rawPayload);
            byte[] supplied = HexFormat.of().parseHex(suppliedSignature.trim());
            return MessageDigest.isEqual(expected, supplied);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            return false;
        }
    }
}
