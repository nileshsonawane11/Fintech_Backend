package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class CardApplicationAlreadyExistsException extends ApiException {
    public CardApplicationAlreadyExistsException(String message) {
        super("CARD_APPLICATION_ALREADY_EXISTS", message, HttpStatus.CONFLICT);
    }
}
