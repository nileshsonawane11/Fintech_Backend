package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class ExternalServiceUnavailableException extends ApiException {
    public ExternalServiceUnavailableException(String message) {
        super("EXTERNAL_SERVICE_UNAVAILABLE", message, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
