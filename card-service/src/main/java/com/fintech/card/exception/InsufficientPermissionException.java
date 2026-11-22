package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class InsufficientPermissionException extends ApiException {
    public InsufficientPermissionException(String message) {
        super("INSUFFICIENT_PERMISSION", message, HttpStatus.FORBIDDEN);
    }
}
