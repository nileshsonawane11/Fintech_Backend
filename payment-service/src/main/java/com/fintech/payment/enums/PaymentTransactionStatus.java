package com.fintech.payment.enums;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum PaymentTransactionStatus {
    INITIATED,
    ORDER_CREATED,
    PAYMENT_PENDING,
    AUTHORIZED,
    CAPTURED,
    PROCESSING,
    COMPLETED,
    FAILED,
    CANCELLED,
    REFUND_PENDING,
    PARTIALLY_REFUNDED,
    REFUNDED;

    private static final Map<PaymentTransactionStatus, Set<PaymentTransactionStatus>> VALID_TRANSITIONS =
            new EnumMap<>(PaymentTransactionStatus.class);

    static {
        VALID_TRANSITIONS.put(INITIATED, EnumSet.of(ORDER_CREATED, FAILED, CANCELLED));
        VALID_TRANSITIONS.put(ORDER_CREATED, EnumSet.of(PAYMENT_PENDING, AUTHORIZED, CAPTURED, FAILED, CANCELLED));
        VALID_TRANSITIONS.put(PAYMENT_PENDING, EnumSet.of(AUTHORIZED, CAPTURED, FAILED, CANCELLED));
        VALID_TRANSITIONS.put(AUTHORIZED, EnumSet.of(CAPTURED, FAILED, CANCELLED));
        VALID_TRANSITIONS.put(CAPTURED, EnumSet.of(PROCESSING, COMPLETED, REFUND_PENDING, PARTIALLY_REFUNDED, REFUNDED, FAILED));
        VALID_TRANSITIONS.put(PROCESSING, EnumSet.of(COMPLETED, FAILED, REFUND_PENDING));
        VALID_TRANSITIONS.put(COMPLETED, EnumSet.of(REFUND_PENDING, PARTIALLY_REFUNDED, REFUNDED));
        // An order can have multiple payment attempts in Razorpay; a subsequent captured payment can recover from FAILED.
        VALID_TRANSITIONS.put(FAILED, EnumSet.of(PAYMENT_PENDING, AUTHORIZED, CAPTURED));
        VALID_TRANSITIONS.put(CANCELLED, EnumSet.noneOf(PaymentTransactionStatus.class));
        VALID_TRANSITIONS.put(REFUND_PENDING, EnumSet.of(PARTIALLY_REFUNDED, REFUNDED, COMPLETED));
        VALID_TRANSITIONS.put(PARTIALLY_REFUNDED, EnumSet.of(REFUND_PENDING, PARTIALLY_REFUNDED, REFUNDED));
        VALID_TRANSITIONS.put(REFUNDED, EnumSet.noneOf(PaymentTransactionStatus.class));
    }

    public boolean canTransitionTo(PaymentTransactionStatus target) {
        if (target == null) {
            return false;
        }
        if (this == target) {
            return true;
        }
        return VALID_TRANSITIONS.getOrDefault(this, EnumSet.noneOf(PaymentTransactionStatus.class)).contains(target);
    }

    public boolean isTerminal() {
        return this == COMPLETED || this == CANCELLED || this == REFUNDED;
    }
}
