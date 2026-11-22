package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class ExternalServiceTimeoutException extends ApiException {
    public ExternalServiceTimeoutException(String message) {
        super("EXTERNAL_SERVICE_TIMEOUT", message, HttpStatus.GATEWAY_TIMEOUT);
    }
}
