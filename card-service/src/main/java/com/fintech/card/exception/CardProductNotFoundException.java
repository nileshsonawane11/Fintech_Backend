package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class CardProductNotFoundException extends ApiException {
    public CardProductNotFoundException(String message) {
        super("CARD_PRODUCT_NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }
}
