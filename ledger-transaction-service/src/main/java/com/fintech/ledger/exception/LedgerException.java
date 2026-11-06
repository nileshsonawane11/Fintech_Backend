package com.fintech.ledger.exception;

import org.springframework.http.HttpStatus;

public class LedgerException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public LedgerException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public static LedgerException unauthorized(String message) {
        return new LedgerException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    public static LedgerException forbidden(String message) {
        return new LedgerException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public static LedgerException badRequest(String errorCode, String message) {
        return new LedgerException(HttpStatus.BAD_REQUEST, errorCode, message);
    }

    public static LedgerException notFound(String errorCode, String message) {
        return new LedgerException(HttpStatus.NOT_FOUND, errorCode, message);
    }

    public static LedgerException conflict(String errorCode, String message) {
        return new LedgerException(HttpStatus.CONFLICT, errorCode, message);
    }

    public static LedgerException unprocessable(String errorCode, String message) {
        return new LedgerException(HttpStatus.UNPROCESSABLE_ENTITY, errorCode, message);
    }

    public static LedgerException insufficientBalance(String message) {
        return new LedgerException(HttpStatus.UNPROCESSABLE_ENTITY, "INSUFFICIENT_BALANCE", message);
    }

    public static LedgerException unbalancedPosting(String message) {
        return new LedgerException(HttpStatus.UNPROCESSABLE_ENTITY, "UNBALANCED_POSTING", message);
    }

    public static LedgerException inactiveAccount(String message) {
        return new LedgerException(HttpStatus.UNPROCESSABLE_ENTITY, "INACTIVE_LEDGER_ACCOUNT", message);
    }

    public static LedgerException currencyMismatch(String message) {
        return new LedgerException(HttpStatus.UNPROCESSABLE_ENTITY, "CURRENCY_MISMATCH", message);
    }

    public static LedgerException idempotencyKeyReused(String message) {
        return new LedgerException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED", message);
    }

    public static LedgerException duplicateTransaction(String message) {
        return new LedgerException(HttpStatus.CONFLICT, "DUPLICATE_TRANSACTION", message);
    }

    public static LedgerException accountNotFound(String message) {
        return new LedgerException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", message);
    }

    public static LedgerException ledgerAccountNotFound(String message) {
        return new LedgerException(HttpStatus.NOT_FOUND, "LEDGER_ACCOUNT_NOT_FOUND", message);
    }

    public static LedgerException transactionNotFound(String message) {
        return new LedgerException(HttpStatus.NOT_FOUND, "TRANSACTION_NOT_FOUND", message);
    }

    public static LedgerException holdNotFound(String message) {
        return new LedgerException(HttpStatus.NOT_FOUND, "HOLD_NOT_FOUND", message);
    }
}
