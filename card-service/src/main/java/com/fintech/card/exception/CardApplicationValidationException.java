package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class CardApplicationValidationException extends ApiException {
    public CardApplicationValidationException(String message) {
        super("CARD_APPLICATION_INVALID", message, HttpStatus.BAD_REQUEST);
    }
}
