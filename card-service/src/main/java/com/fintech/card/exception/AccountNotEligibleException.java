package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class AccountNotEligibleException extends ApiException {
    public AccountNotEligibleException(String message) {
        super("ACCOUNT_NOT_ELIGIBLE", message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
