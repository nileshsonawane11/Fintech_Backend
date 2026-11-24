package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class AddressNotDeliverableException extends ApiException {
    public AddressNotDeliverableException(String message) {
        super("ADDRESS_NOT_DELIVERABLE", message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
