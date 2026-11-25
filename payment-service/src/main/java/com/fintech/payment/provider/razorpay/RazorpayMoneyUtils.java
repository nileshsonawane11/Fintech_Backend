package com.fintech.payment.provider.razorpay;

import com.fintech.payment.exception.ApiException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class RazorpayMoneyUtils {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private RazorpayMoneyUtils() {}

    public static long toPaise(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", "Amount must be greater than zero");
        }
        BigDecimal scaled = amount.setScale(2, RoundingMode.UNNECESSARY);
        return scaled.multiply(HUNDRED).longValueExact();
    }

    public static BigDecimal fromPaise(long paise) {
        return BigDecimal.valueOf(paise).divide(HUNDRED, 4, RoundingMode.HALF_UP);
    }

    public static BigDecimal fromNullablePaise(Long paise) {
        return paise == null ? BigDecimal.ZERO : fromPaise(paise);
    }
}
