package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class CustomerNotFoundException extends ApiException {
    public CustomerNotFoundException(String message) {
        super("CUSTOMER_NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }
}
