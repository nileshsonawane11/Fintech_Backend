package com.fintech.payment.service;

import com.fintech.payment.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PaymentPiiEncryptionServiceTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    void encryptsAndDecryptsAccountNumberUsingFreshIv() {
        PaymentPiiEncryptionService encryption = new PaymentPiiEncryptionService(KEY);

        String first = encryption.encrypt("123456789012");
        String second = encryption.encrypt("123456789012");

        assertTrue(encryption.isEncrypted(first));
        assertNotEquals("123456789012", first);
        assertNotEquals(first, second);
        assertEquals("123456789012", encryption.decrypt(first));
    }

    @Test
    void refusesToStoreAccountNumberWhenEncryptionKeyIsMissing() {
        PaymentPiiEncryptionService encryption = new PaymentPiiEncryptionService("");

        ApiException exception = assertThrows(ApiException.class,
                () -> encryption.encrypt("123456789012"));

        assertEquals("PII_ENCRYPTION_NOT_CONFIGURED", exception.getCode());
        assertEquals(503, exception.getHttpStatus().value());
    }
}
