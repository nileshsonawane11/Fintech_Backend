package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class AddressOwnershipMismatchException extends ApiException {
    public AddressOwnershipMismatchException(String message) {
        super("ADDRESS_OWNERSHIP_MISMATCH", message, HttpStatus.FORBIDDEN);
    }
}
