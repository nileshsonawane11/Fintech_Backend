package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class CardProductValidationException extends ApiException {
    public CardProductValidationException(String message) {
        super("INVALID_CARD_PRODUCT", message, HttpStatus.BAD_REQUEST);
    }
}
