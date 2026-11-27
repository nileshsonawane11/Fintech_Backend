package com.fintech.payment.provider.razorpay;

import com.fintech.payment.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

@Component
public class RazorpayCheckoutSignatureVerifier {

    public boolean verifyCheckoutSignature(
            String razorpayOrderId,
            String razorpayPaymentId,
            String suppliedSignature,
            String keySecret) {
        if (keySecret == null || keySecret.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "RAZORPAY_NOT_CONFIGURED",
                    "Razorpay key secret is not configured");
        }
        if (razorpayOrderId == null || razorpayOrderId.isBlank()
                || razorpayPaymentId == null || razorpayPaymentId.isBlank()
                || suppliedSignature == null || !suppliedSignature.trim().matches("(?i)[0-9a-f]{64}")) {
            return false;
        }

        String payload = razorpayOrderId.trim() + "|" + razorpayPaymentId.trim();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            byte[] supplied = HexFormat.of().parseHex(suppliedSignature.trim());
            return MessageDigest.isEqual(expected, supplied);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            return false;
        }
    }
}
