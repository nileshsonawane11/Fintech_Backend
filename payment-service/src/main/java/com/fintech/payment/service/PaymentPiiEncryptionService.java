package com.fintech.payment.service;

import com.fintech.payment.exception.ApiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

@Component
public class PaymentPiiEncryptionService {

    private static final String PREFIX = "enc:v1:";
    private static final byte[] AAD = "payment-beneficiary-account:v1".getBytes(StandardCharsets.UTF_8);
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final byte[] keyBytes;
    private final String hashSalt;
    private final SecureRandom secureRandom = new SecureRandom();

    public PaymentPiiEncryptionService(String base64Key) {
        this(base64Key, "");
    }

    @Autowired
    public PaymentPiiEncryptionService(
            @Value("${payment.pii.encryption-key:}") String base64Key,
            @Value("${payment.pii.hash-salt:}") String hashSalt) {
        this.hashSalt = hashSalt != null ? hashSalt : "";
        if (base64Key == null || base64Key.isBlank()) {
            keyBytes = null;
            return;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(base64Key.trim());
            if (decoded.length != 32) {
                throw new IllegalArgumentException("Key must decode to exactly 32 bytes");
            }
            keyBytes = decoded;
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "PAYMENT_PII_ENCRYPTION_KEY must be Base64 encoding of exactly 32 random bytes", exception);
        }
    }

    public boolean isConfigured() {
        return keyBytes != null;
    }

    public boolean isEncrypted(String value) {
        return value != null && value.startsWith(PREFIX);
    }

    public String encrypt(String plaintext) {
        requireKey();
        if (plaintext == null) {
            throw new IllegalArgumentException("Sensitive value cannot be null");
        }
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(keyBytes, "AES"),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            cipher.updateAAD(AAD);
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] packed = ByteBuffer.allocate(iv.length + ciphertext.length)
                    .put(iv)
                    .put(ciphertext)
                    .array();
            return PREFIX + Base64.getEncoder().withoutPadding().encodeToString(packed);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Could not encrypt sensitive payment value", exception);
        }
    }

    public String decrypt(String encryptedValue) {
        requireKey();
        if (!isEncrypted(encryptedValue)) {
            throw new IllegalArgumentException("Value is not an encrypted value");
        }
        try {
            byte[] packed = Base64.getDecoder().decode(encryptedValue.substring(PREFIX.length()));
            if (packed.length <= IV_LENGTH_BYTES) {
                throw new IllegalArgumentException("Encrypted value is malformed");
            }
            byte[] iv = Arrays.copyOfRange(packed, 0, IV_LENGTH_BYTES);
            byte[] ciphertext = Arrays.copyOfRange(packed, IV_LENGTH_BYTES, packed.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            cipher.updateAAD(AAD);
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("Could not decrypt sensitive payment value", exception);
        }
    }

    /**
     * Produces a deterministic keyed HMAC-SHA256 (if key/salt configured) or SHA-256 fingerprint
     * for duplicate beneficiary detection without storing plaintext sensitive identifiers.
     */
    public String fingerprint(String normalizedValue) {
        if (normalizedValue == null || normalizedValue.isBlank()) {
            return null;
        }
        try {
            if (keyBytes != null) {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(keyBytes, "HmacSHA256"));
                if (!hashSalt.isEmpty()) {
                    mac.update(hashSalt.getBytes(StandardCharsets.UTF_8));
                }
                return HexFormat.of().formatHex(mac.doFinal(normalizedValue.getBytes(StandardCharsets.UTF_8)));
            }
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            if (!hashSalt.isEmpty()) {
                digest.update(hashSalt.getBytes(StandardCharsets.UTF_8));
            }
            return HexFormat.of().formatHex(digest.digest(normalizedValue.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Could not compute deterministic fingerprint", exception);
        }
    }

    private void requireKey() {
        if (!isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PII_ENCRYPTION_NOT_CONFIGURED",
                    "Beneficiary account encryption is not configured");
        }
    }
}
