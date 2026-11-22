package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class AccountNotFoundException extends ApiException {
    public AccountNotFoundException(String message) {
        super("ACCOUNT_NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }
}
