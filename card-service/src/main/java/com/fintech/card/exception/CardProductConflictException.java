package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class CardProductConflictException extends ApiException {
    public CardProductConflictException(String message) {
        super("CARD_PRODUCT_CONFLICT", message, HttpStatus.CONFLICT);
    }

    public CardProductConflictException(String code, String message) {
        super(code, message, HttpStatus.CONFLICT);
    }
}
