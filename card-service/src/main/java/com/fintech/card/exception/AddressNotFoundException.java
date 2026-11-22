package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class AddressNotFoundException extends ApiException {
    public AddressNotFoundException(String message) {
        super("ADDRESS_NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }
}
