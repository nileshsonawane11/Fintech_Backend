package com.fintech.card.enums;

public enum CardType {
    CREDIT,
    DEBIT;

    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (CardType type : values()) {
            if (type.name().equalsIgnoreCase(value.trim())) {
                return true;
            }
        }
        return false;
    }

    public static CardType fromString(String value) {
        if (value == null) {
            return null;
        }
        for (CardType type : values()) {
            if (type.name().equalsIgnoreCase(value.trim())) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown card type: " + value);
    }
}
