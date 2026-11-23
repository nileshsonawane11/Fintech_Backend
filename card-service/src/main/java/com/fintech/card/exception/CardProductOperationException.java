package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class CardProductOperationException extends ApiException {
    public CardProductOperationException(String message) {
        super("CARD_PRODUCT_OPERATION_INVALID", message, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public CardProductOperationException(String code, String message) {
        super(code, message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
