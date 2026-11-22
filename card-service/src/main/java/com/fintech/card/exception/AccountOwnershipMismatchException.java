package com.fintech.card.exception;

import org.springframework.http.HttpStatus;

public class AccountOwnershipMismatchException extends ApiException {
    public AccountOwnershipMismatchException(String message) {
        super("ACCOUNT_OWNERSHIP_MISMATCH", message, HttpStatus.FORBIDDEN);
    }
}
